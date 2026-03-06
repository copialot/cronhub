package repository

import (
	"cronhub/internal/model"
	"time"

	"gorm.io/gorm"
)

type ExecutionLogRepo struct {
	db *gorm.DB
}

func NewExecutionLogRepo(db *gorm.DB) *ExecutionLogRepo {
	return &ExecutionLogRepo{db: db}
}

func (r *ExecutionLogRepo) Create(log *model.ExecutionLog) error {
	return r.db.Create(log).Error
}

func (r *ExecutionLogRepo) Update(log *model.ExecutionLog) error {
	return r.db.Save(log).Error
}

func (r *ExecutionLogRepo) GetByID(id uint) (*model.ExecutionLog, error) {
	var log model.ExecutionLog
	err := r.db.Preload("Task").First(&log, id).Error
	return &log, err
}

func (r *ExecutionLogRepo) ListByTaskID(taskID uint, limit, offset int) ([]model.ExecutionLog, int64, error) {
	var logs []model.ExecutionLog
	var total int64

	q := r.db.Model(&model.ExecutionLog{}).Where("task_id = ?", taskID)
	q.Count(&total)
	err := q.Order("id DESC").Limit(limit).Offset(offset).Find(&logs).Error
	return logs, total, err
}

func (r *ExecutionLogRepo) ListRecent(limit int) ([]model.ExecutionLog, error) {
	var logs []model.ExecutionLog
	err := r.db.Preload("Task").Order("id DESC").Limit(limit).Find(&logs).Error
	return logs, err
}

func (r *ExecutionLogRepo) ListAll(status *string, from, to *time.Time, limit, offset int) ([]model.ExecutionLog, int64, error) {
	var logs []model.ExecutionLog
	var total int64

	q := r.db.Model(&model.ExecutionLog{})
	if status != nil {
		q = q.Where("status = ?", *status)
	}
	if from != nil {
		q = q.Where("started_at >= ?", *from)
	}
	if to != nil {
		q = q.Where("started_at <= ?", *to)
	}
	q.Count(&total)
	err := q.Preload("Task").Order("id DESC").Limit(limit).Offset(offset).Find(&logs).Error
	return logs, total, err
}

// 统计相关查询
type StatsOverview struct {
	TotalTasks     int64 `json:"total_tasks"`
	RunningTasks   int64 `json:"running_tasks"`
	TodaySuccess   int64 `json:"today_success"`
	TodayFailed    int64 `json:"today_failed"`
	TodayTotal     int64 `json:"today_total"`
	TotalExecs     int64 `json:"total_executions"`
}

func (r *ExecutionLogRepo) GetStatsOverview() (*StatsOverview, error) {
	var stats StatsOverview
	today := time.Now().Truncate(24 * time.Hour)

	r.db.Model(&model.Task{}).Count(&stats.TotalTasks)
	r.db.Model(&model.Task{}).Where("status = ?", model.TaskStatusRunning).Count(&stats.RunningTasks)
	r.db.Model(&model.ExecutionLog{}).Where("started_at >= ? AND status = ?", today, model.ExecStatusSuccess).Count(&stats.TodaySuccess)
	r.db.Model(&model.ExecutionLog{}).Where("started_at >= ? AND status IN ?", today, []model.ExecStatus{model.ExecStatusFailed, model.ExecStatusTimeout}).Count(&stats.TodayFailed)
	r.db.Model(&model.ExecutionLog{}).Where("started_at >= ?", today).Count(&stats.TodayTotal)
	r.db.Model(&model.ExecutionLog{}).Count(&stats.TotalExecs)

	return &stats, nil
}

type DailyStats struct {
	Date         string  `json:"date"`
	Total        int64   `json:"total"`
	Success      int64   `json:"success"`
	Failed       int64   `json:"failed"`
	SuccessRate  float64 `json:"success_rate"`
	AvgDuration  float64 `json:"avg_duration"`
}

func (r *ExecutionLogRepo) GetDailyStats(days int) ([]DailyStats, error) {
	var results []DailyStats
	since := time.Now().AddDate(0, 0, -days).Truncate(24 * time.Hour)

	err := r.db.Raw(`
		SELECT
			DATE(started_at) as date,
			COUNT(*) as total,
			SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
			SUM(CASE WHEN status IN ('failed', 'timeout') THEN 1 ELSE 0 END) as failed,
			CASE WHEN COUNT(*) > 0
				THEN ROUND(SUM(CASE WHEN status = 'success' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1)
				ELSE 0 END as success_rate,
			COALESCE(AVG(duration_ms), 0) as avg_duration
		FROM execution_logs
		WHERE started_at >= ? AND status != 'running'
		GROUP BY DATE(started_at)
		ORDER BY date ASC
	`, since).Scan(&results).Error

	return results, err
}

type TaskStats struct {
	TotalExecs   int64   `json:"total_executions"`
	SuccessCount int64   `json:"success_count"`
	FailedCount  int64   `json:"failed_count"`
	SuccessRate  float64 `json:"success_rate"`
	AvgDuration  float64 `json:"avg_duration"`
	MaxDuration  int64   `json:"max_duration"`
	MinDuration  int64   `json:"min_duration"`
}

func (r *ExecutionLogRepo) GetTaskStats(taskID uint) (*TaskStats, error) {
	var stats TaskStats

	r.db.Model(&model.ExecutionLog{}).Where("task_id = ? AND status != ?", taskID, model.ExecStatusRunning).Count(&stats.TotalExecs)
	r.db.Model(&model.ExecutionLog{}).Where("task_id = ? AND status = ?", taskID, model.ExecStatusSuccess).Count(&stats.SuccessCount)
	r.db.Model(&model.ExecutionLog{}).Where("task_id = ? AND status IN ?", taskID, []model.ExecStatus{model.ExecStatusFailed, model.ExecStatusTimeout}).Count(&stats.FailedCount)

	if stats.TotalExecs > 0 {
		stats.SuccessRate = float64(stats.SuccessCount) / float64(stats.TotalExecs) * 100
	}

	r.db.Model(&model.ExecutionLog{}).
		Where("task_id = ? AND status != ?", taskID, model.ExecStatusRunning).
		Select("COALESCE(AVG(duration_ms), 0)").Scan(&stats.AvgDuration)
	r.db.Model(&model.ExecutionLog{}).
		Where("task_id = ? AND status != ?", taskID, model.ExecStatusRunning).
		Select("COALESCE(MAX(duration_ms), 0)").Scan(&stats.MaxDuration)
	r.db.Model(&model.ExecutionLog{}).
		Where("task_id = ? AND status != ?", taskID, model.ExecStatusRunning).
		Select("COALESCE(MIN(duration_ms), 0)").Scan(&stats.MinDuration)

	return &stats, nil
}
