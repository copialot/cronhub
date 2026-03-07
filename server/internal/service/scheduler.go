package service

import (
	"log"
	"sync"
	"time"

	"cronhub/internal/model"
	"cronhub/internal/repository"
	"cronhub/pkg/cronutil"

	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	mu               sync.RWMutex
	cron             *cron.Cron
	entries          map[uint]cron.EntryID // taskID -> cronEntryID
	taskRepo         *repository.TaskRepo
	executor         *Executor
	logRepo          *repository.ExecutionLogRepo
	logRetentionDays int
}

func NewScheduler(taskRepo *repository.TaskRepo, executor *Executor, logRepo *repository.ExecutionLogRepo, retentionDays int) *Scheduler {
	parser := cronutil.GetParser()
	c := cron.New(cron.WithParser(parser), cron.WithChain(cron.Recover(cron.DefaultLogger)))

	return &Scheduler{
		cron:             c,
		entries:          make(map[uint]cron.EntryID),
		taskRepo:         taskRepo,
		executor:         executor,
		logRepo:          logRepo,
		logRetentionDays: retentionDays,
	}
}

// Start 启动调度器，加载所有启用的任务
func (s *Scheduler) Start() error {
	tasks, err := s.taskRepo.ListEnabled()
	if err != nil {
		return err
	}

	for i := range tasks {
		if err := s.addTask(&tasks[i]); err != nil {
			log.Printf("加载任务 [%d] %s 失败: %v", tasks[i].ID, tasks[i].Name, err)
		}
	}

	// 注册日志清理任务：每天凌晨 2:00
	if s.logRepo != nil && s.logRetentionDays > 0 {
		s.cron.AddFunc("0 2 * * *", func() {
			before := time.Now().AddDate(0, 0, -s.logRetentionDays)
			deleted, err := s.logRepo.DeleteBefore(before)
			if err != nil {
				log.Printf("清理执行日志失败: %v", err)
			} else if deleted > 0 {
				log.Printf("已清理 %d 条过期执行日志（保留 %d 天）", deleted, s.logRetentionDays)
			}
		})
	}

	s.cron.Start()
	log.Printf("调度器已启动，加载了 %d 个任务", len(tasks))
	return nil
}

// Stop 优雅停止调度器
func (s *Scheduler) Stop() {
	ctx := s.cron.Stop()
	<-ctx.Done()
	log.Println("调度器已停止")
}

// AddTask 添加任务到调度器
func (s *Scheduler) AddTask(task *model.Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.addTask(task)
}

func (s *Scheduler) addTask(task *model.Task) error {
	// 如果已存在，先移除
	if entryID, ok := s.entries[task.ID]; ok {
		s.cron.Remove(entryID)
		delete(s.entries, task.ID)
	}

	if !task.Enabled {
		return nil
	}

	taskCopy := *task
	entryID, err := s.cron.AddFunc(task.CronExpr, func() {
		s.executor.Execute(&taskCopy, model.TriggerSchedule)
	})
	if err != nil {
		return err
	}

	s.entries[task.ID] = entryID

	// 更新 next_run_at
	entry := s.cron.Entry(entryID)
	nextRun := entry.Next
	s.taskRepo.UpdateNextRunAt(task.ID, &nextRun)

	log.Printf("任务 [%d] %s 已注册调度: %s", task.ID, task.Name, task.CronExpr)
	return nil
}

// RemoveTask 从调度器移除任务
func (s *Scheduler) RemoveTask(taskID uint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, ok := s.entries[taskID]; ok {
		s.cron.Remove(entryID)
		delete(s.entries, taskID)
		s.taskRepo.UpdateNextRunAt(taskID, nil)
		log.Printf("任务 [%d] 已从调度器移除", taskID)
	}
}

// UpdateTask 更新调度器中的任务
func (s *Scheduler) UpdateTask(task *model.Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 先移除旧的
	if entryID, ok := s.entries[task.ID]; ok {
		s.cron.Remove(entryID)
		delete(s.entries, task.ID)
	}

	// 如果启用则重新添加
	return s.addTask(task)
}
