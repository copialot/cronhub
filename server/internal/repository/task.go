package repository

import (
	"time"

	"cronhub/internal/model"

	"gorm.io/gorm"
)

type TaskRepo struct {
	db *gorm.DB
}

func NewTaskRepo(db *gorm.DB) *TaskRepo {
	return &TaskRepo{db: db}
}

func (r *TaskRepo) List(groupID *uint, enabled *bool) ([]model.Task, error) {
	q := r.db.Preload("Group")
	if groupID != nil {
		q = q.Where("group_id = ?", *groupID)
	}
	if enabled != nil {
		q = q.Where("enabled = ?", *enabled)
	}
	var tasks []model.Task
	err := q.Order("id DESC").Find(&tasks).Error
	return tasks, err
}

func (r *TaskRepo) GetByID(id uint) (*model.Task, error) {
	var task model.Task
	err := r.db.Preload("Group").First(&task, id).Error
	return &task, err
}

func (r *TaskRepo) Create(task *model.Task) error {
	return r.db.Create(task).Error
}

func (r *TaskRepo) Update(task *model.Task) error {
	return r.db.Save(task).Error
}

func (r *TaskRepo) Delete(id uint) error {
	return r.db.Delete(&model.Task{}, id).Error
}

func (r *TaskRepo) UpdateStatus(id uint, status model.TaskStatus) error {
	return r.db.Model(&model.Task{}).Where("id = ?", id).Update("status", status).Error
}

func (r *TaskRepo) ListEnabled() ([]model.Task, error) {
	var tasks []model.Task
	err := r.db.Where("enabled = ?", true).Find(&tasks).Error
	return tasks, err
}

func (r *TaskRepo) UpdateLastRunAt(id uint, t time.Time) error {
	return r.db.Model(&model.Task{}).Where("id = ?", id).Update("last_run_at", t).Error
}

func (r *TaskRepo) UpdateNextRunAt(id uint, t *time.Time) error {
	return r.db.Model(&model.Task{}).Where("id = ?", id).Update("next_run_at", t).Error
}
