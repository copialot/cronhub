package service

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"
	"sync"
	"syscall"
	"time"

	"cronhub/internal/model"
	"cronhub/internal/repository"
	"cronhub/internal/ws"
)

const maxOutputSize = 64 * 1024 // 64KB

type Executor struct {
	taskRepo  *repository.TaskRepo
	logRepo   *repository.ExecutionLogRepo
	hub       *ws.Hub
	alertSvc  *AlertService
	scriptSvc *ScriptService
}

func NewExecutor(taskRepo *repository.TaskRepo, logRepo *repository.ExecutionLogRepo, hub *ws.Hub, alertSvc *AlertService) *Executor {
	return &Executor{
		taskRepo: taskRepo,
		logRepo:  logRepo,
		hub:      hub,
		alertSvc: alertSvc,
	}
}

func (e *Executor) SetScriptService(svc *ScriptService) {
	e.scriptSvc = svc
}

type wsMessage struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

// Prepare 同步创建执行记录并返回 ID，供 Handler 先返回给前端
func (e *Executor) Prepare(task *model.Task, triggerType model.TriggerType) (uint, error) {
	now := time.Now()
	execLog := &model.ExecutionLog{
		TaskID:      task.ID,
		Status:      model.ExecStatusRunning,
		TriggerType: triggerType,
		StartedAt:   now,
	}
	if err := e.logRepo.Create(execLog); err != nil {
		return 0, err
	}
	e.taskRepo.UpdateStatus(task.ID, model.TaskStatusRunning)
	return execLog.ID, nil
}

// ExecuteWithID 使用已创建的 executionId 执行任务
func (e *Executor) ExecuteWithID(task *model.Task, execID uint) {
	execLog, err := e.logRepo.GetByID(execID)
	if err != nil {
		log.Printf("获取执行记录失败: %v", err)
		return
	}
	now := execLog.StartedAt
	roomID := fmt.Sprintf("exec_%d", execLog.ID)

	e.broadcastWS(roomID, "start", fmt.Sprintf("开始执行任务: %s", task.Name))

	var exitCode int
	var output, errOutput string
	var success bool

	for attempt := 0; attempt <= task.RetryCount; attempt++ {
		if attempt > 0 {
			e.broadcastWS(roomID, "retry", fmt.Sprintf("第 %d 次重试...", attempt))
			time.Sleep(time.Second * 2)
		}
		exitCode, output, errOutput = e.runCommand(task, roomID)
		success = exitCode == 0
		if success {
			break
		}
	}

	finished := time.Now()
	duration := finished.Sub(now).Milliseconds()

	output = truncate(output, maxOutputSize)
	errOutput = truncate(errOutput, maxOutputSize)

	execLog.ExitCode = &exitCode
	execLog.Output = output
	execLog.ErrorOutput = errOutput
	execLog.DurationMs = duration
	execLog.FinishedAt = &finished

	if success {
		execLog.Status = model.ExecStatusSuccess
		e.taskRepo.UpdateStatus(task.ID, model.TaskStatusIdle)
	} else {
		execLog.Status = model.ExecStatusFailed
		e.taskRepo.UpdateStatus(task.ID, model.TaskStatusFailed)
	}

	e.logRepo.Update(execLog)
	e.taskRepo.UpdateLastRunAt(task.ID, now)

	status := "success"
	if !success {
		status = "failed"
	}
	e.broadcastWS(roomID, "finish", fmt.Sprintf("执行完成: %s, 耗时: %dms", status, duration))

	if e.alertSvc != nil {
		e.alertSvc.Check(task, execLog)
	}
}

// Execute 保留原有接口供调度器调用
func (e *Executor) Execute(task *model.Task, triggerType model.TriggerType) {
	execID, err := e.Prepare(task, triggerType)
	if err != nil {
		log.Printf("创建执行记录失败: %v", err)
		return
	}
	e.ExecuteWithID(task, execID)
}

func (e *Executor) runCommand(task *model.Task, roomID string) (exitCode int, stdout, stderr string) {
	timeout := time.Duration(task.Timeout) * time.Second
	if timeout == 0 {
		timeout = time.Hour
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	command := task.Command
	if e.scriptSvc != nil && strings.HasPrefix(command, "#!script:") {
		scriptName := strings.TrimSpace(strings.TrimPrefix(command, "#!script:"))
		script, err := e.scriptSvc.GetByName(scriptName)
		if err != nil {
			errMsg := fmt.Sprintf("脚本不存在: %s", scriptName)
			e.broadcastWS(roomID, "stderr", errMsg)
			return 1, "", errMsg
		}
		interpreter := e.scriptSvc.GetInterpreter(script.Language)
		scriptPath := e.scriptSvc.GetScriptPath(script)
		command = fmt.Sprintf("%s %s", interpreter, scriptPath)
	}

	cmd := exec.Command("sh", "-c", command)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if task.WorkingDir != "" {
		cmd.Dir = task.WorkingDir
	}

	// 设置环境变量：继承父进程环境，补全常见 PATH，再追加任务自定义变量
	env := os.Environ()
	extraPaths := []string{"/usr/local/bin", "/usr/local/sbin", "/opt/homebrew/bin", "/opt/homebrew/sbin"}
	for i, e := range env {
		if strings.HasPrefix(e, "PATH=") {
			p := e[5:]
			for _, ep := range extraPaths {
				if !strings.Contains(":"+p+":", ":"+ep+":") {
					p = p + ":" + ep
				}
			}
			env[i] = "PATH=" + p
			break
		}
	}
	cmd.Env = env
	if task.EnvVars != nil {
		for k, v := range task.EnvVars {
			cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
		}
	}

	stdoutPipe, _ := cmd.StdoutPipe()
	stderrPipe, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		errMsg := fmt.Sprintf("启动命令失败: %v", err)
		e.broadcastWS(roomID, "stderr", errMsg)
		return 1, "", errMsg
	}

	// 超时时 kill 整个进程组，确保子进程不残留
	go func() {
		<-ctx.Done()
		if ctx.Err() == context.DeadlineExceeded && cmd.Process != nil {
			_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		}
	}()

	var stdoutBuf, stderrBuf strings.Builder
	var wg sync.WaitGroup

	wg.Add(2)
	go func() {
		defer wg.Done()
		e.streamOutput(stdoutPipe, &stdoutBuf, roomID, "stdout")
	}()
	go func() {
		defer wg.Done()
		e.streamOutput(stderrPipe, &stderrBuf, roomID, "stderr")
	}()

	wg.Wait()

	if err := cmd.Wait(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			e.broadcastWS(roomID, "stderr", "执行超时")
			return -1, stdoutBuf.String(), "执行超时"
		}
		if exitErr, ok := err.(*exec.ExitError); ok {
			return exitErr.ExitCode(), stdoutBuf.String(), stderrBuf.String()
		}
		return 1, stdoutBuf.String(), stderrBuf.String()
	}

	return 0, stdoutBuf.String(), stderrBuf.String()
}

func (e *Executor) streamOutput(pipe io.Reader, buf *strings.Builder, roomID, outputType string) {
	scanner := bufio.NewScanner(pipe)
	scanner.Buffer(make([]byte, 4096), 1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		buf.WriteString(line)
		buf.WriteString("\n")
		e.broadcastWS(roomID, outputType, line)
	}
}

func (e *Executor) broadcastWS(roomID, msgType, data string) {
	msg := wsMessage{Type: msgType, Data: data}
	b, _ := json.Marshal(msg)
	e.hub.Broadcast(roomID, b)
}

func truncate(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "\n... [输出已截断]"
	}
	return s
}
