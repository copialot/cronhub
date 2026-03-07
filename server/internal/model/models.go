package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// JSONMap 用于存储 JSON 格式的键值对（如环境变量）
type JSONMap map[string]string

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return "{}",nil
	}
	b, err := json.Marshal(j)
	return string(b), err
}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONMap)
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	}
	return json.Unmarshal(bytes, j)
}

type TaskGroup struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:100;not null;uniqueIndex"`
	Color     string    `json:"color" gorm:"size:20;default:#00d4aa"`
	SortOrder int       `json:"sort_order" gorm:"default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Tasks     []Task    `json:"tasks,omitempty" gorm:"foreignKey:GroupID"`
}

type TaskStatus string

const (
	TaskStatusIdle    TaskStatus = "idle"
	TaskStatusRunning TaskStatus = "running"
	TaskStatusFailed  TaskStatus = "failed"
)

type Task struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	Name       string     `json:"name" gorm:"size:200;not null"`
	GroupID    *uint      `json:"group_id" gorm:"index"`
	Group      *TaskGroup `json:"group,omitempty" gorm:"foreignKey:GroupID"`
	CronExpr   string     `json:"cron_expr" gorm:"size:100;not null"`
	Command    string     `json:"command" gorm:"type:text;not null"`
	WorkingDir string     `json:"working_dir" gorm:"size:500"`
	Timeout    int        `json:"timeout" gorm:"default:3600"` // 秒
	RetryCount int        `json:"retry_count" gorm:"default:0"`
	Enabled    bool       `json:"enabled" gorm:"default:true"`
	Status     TaskStatus `json:"status" gorm:"size:20;default:idle"`
	EnvVars    JSONMap    `json:"env_vars" gorm:"type:text"`
	LastRunAt  *time.Time `json:"last_run_at"`
	NextRunAt  *time.Time `json:"next_run_at"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type ExecStatus string

const (
	ExecStatusRunning ExecStatus = "running"
	ExecStatusSuccess ExecStatus = "success"
	ExecStatusFailed  ExecStatus = "failed"
	ExecStatusTimeout ExecStatus = "timeout"
)

type TriggerType string

const (
	TriggerSchedule TriggerType = "schedule"
	TriggerManual   TriggerType = "manual"
)

type ExecutionLog struct {
	ID          uint        `json:"id" gorm:"primaryKey"`
	TaskID      uint        `json:"task_id" gorm:"index;not null"`
	Task        *Task       `json:"task,omitempty" gorm:"foreignKey:TaskID"`
	Status      ExecStatus  `json:"status" gorm:"size:20;not null"`
	ExitCode    *int        `json:"exit_code"`
	Output      string      `json:"output" gorm:"type:text"`
	ErrorOutput string      `json:"error_output" gorm:"type:text"`
	DurationMs  int64       `json:"duration_ms"`
	TriggerType TriggerType `json:"trigger_type" gorm:"size:20;not null"`
	StartedAt   time.Time   `json:"started_at"`
	FinishedAt  *time.Time  `json:"finished_at"`
	CreatedAt   time.Time   `json:"created_at"`
}

type AlertType string

const (
	AlertTypeEmail    AlertType = "email"
	AlertTypeWebhook  AlertType = "webhook"
	AlertTypeSlack    AlertType = "slack"
	AlertTypeDingtalk AlertType = "dingtalk"
	AlertTypeFeishu   AlertType = "feishu"
	AlertTypeTelegram AlertType = "telegram"
)

type AlertConfig struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	TaskID    *uint     `json:"task_id" gorm:"index"` // NULL = 全局
	Task      *Task     `json:"task,omitempty" gorm:"foreignKey:TaskID"`
	Type      AlertType `json:"type" gorm:"size:20;not null"`
	Endpoint  string    `json:"endpoint" gorm:"size:500;not null"`
	OnFailure bool      `json:"on_failure" gorm:"default:true"`
	OnTimeout bool      `json:"on_timeout" gorm:"default:true"`
	OnSuccess bool      `json:"on_success" gorm:"default:false"`
	Enabled   bool      `json:"enabled" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
