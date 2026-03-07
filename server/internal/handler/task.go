package handler

import (
	"net/http"
	"strconv"

	"cronhub/internal/model"
	"cronhub/internal/repository"
	"cronhub/internal/service"
	"cronhub/pkg/cronutil"

	"github.com/gin-gonic/gin"
)

type TaskHandler struct {
	repo      *repository.TaskRepo
	scheduler *service.Scheduler
	executor  *service.Executor
}

func NewTaskHandler(repo *repository.TaskRepo, scheduler *service.Scheduler, executor *service.Executor) *TaskHandler {
	return &TaskHandler{repo: repo, scheduler: scheduler, executor: executor}
}

func (h *TaskHandler) List(c *gin.Context) {
	var groupID *uint
	if gid := c.Query("group_id"); gid != "" {
		id, err := strconv.ParseUint(gid, 10, 32)
		if err == nil {
			uid := uint(id)
			groupID = &uid
		}
	}

	var enabled *bool
	if e := c.Query("enabled"); e != "" {
		b := e == "true"
		enabled = &b
	}

	tasks, err := h.repo.List(groupID, enabled)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (h *TaskHandler) Get(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	task, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}
	c.JSON(http.StatusOK, task)
}

type createTaskRequest struct {
	Name       string        `json:"name" binding:"required"`
	GroupID    *uint         `json:"group_id"`
	CronExpr   string        `json:"cron_expr" binding:"required"`
	Command    string        `json:"command" binding:"required"`
	WorkingDir string        `json:"working_dir"`
	Timeout    int           `json:"timeout"`
	RetryCount int           `json:"retry_count"`
	Enabled    *bool         `json:"enabled"`
	EnvVars    model.JSONMap `json:"env_vars"`
}

func (h *TaskHandler) Create(c *gin.Context) {
	var req createTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := cronutil.Validate(req.CronExpr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	timeout := 3600
	if req.Timeout > 0 {
		timeout = req.Timeout
	}

	task := &model.Task{
		Name:       req.Name,
		GroupID:    req.GroupID,
		CronExpr:   req.CronExpr,
		Command:    req.Command,
		WorkingDir: req.WorkingDir,
		Timeout:    timeout,
		RetryCount: req.RetryCount,
		Enabled:    enabled,
		Status:     model.TaskStatusIdle,
		EnvVars:    req.EnvVars,
	}

	if err := h.repo.Create(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 注册到调度器
	if task.Enabled {
		h.scheduler.AddTask(task)
	}

	c.JSON(http.StatusCreated, task)
}

func (h *TaskHandler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	task, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	var req createTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := cronutil.Validate(req.CronExpr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task.Name = req.Name
	task.GroupID = req.GroupID
	task.CronExpr = req.CronExpr
	task.Command = req.Command
	task.WorkingDir = req.WorkingDir
	if req.Timeout > 0 {
		task.Timeout = req.Timeout
	}
	task.RetryCount = req.RetryCount
	if req.Enabled != nil {
		task.Enabled = *req.Enabled
	}
	task.EnvVars = req.EnvVars

	if err := h.repo.Update(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 更新调度器
	h.scheduler.UpdateTask(task)

	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	h.scheduler.RemoveTask(id)

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

func (h *TaskHandler) Toggle(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	task, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	task.Enabled = !task.Enabled
	if err := h.repo.Update(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.scheduler.UpdateTask(task)

	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) Run(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	task, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	execID, err := h.executor.Prepare(task, model.TriggerManual)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建执行记录失败"})
		return
	}

	go h.executor.ExecuteWithID(task, execID)

	c.JSON(http.StatusOK, gin.H{"message": "任务已触发", "execution_id": execID})
}

func parseID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 ID"})
		return 0, err
	}
	return uint(id), nil
}
