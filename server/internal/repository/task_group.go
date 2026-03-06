package repository

import (
	"cronhub/internal/model"

	"gorm.io/gorm"
)

type TaskGroupRepo struct {
	db *gorm.DB
}

func NewTaskGroupRepo(db *gorm.DB) *TaskGroupRepo {
	return &TaskGroupRepo{db: db}
}

func (r *TaskGroupRepo) List() ([]model.TaskGroup, error) {
	var groups []model.TaskGroup
	err := r.db.Order("sort_order ASC, id ASC").Find(&groups).Error
	return groups, err
}

func (r *TaskGroupRepo) GetByID(id uint) (*model.TaskGroup, error) {
	var group model.TaskGroup
	err := r.db.Preload("Tasks").First(&group, id).Error
	return &group, err
}

func (r *TaskGroupRepo) Create(group *model.TaskGroup) error {
	return r.db.Create(group).Error
}

func (r *TaskGroupRepo) Update(group *model.TaskGroup) error {
	return r.db.Save(group).Error
}

func (r *TaskGroupRepo) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 将该分组下的任务设为未分组
		if err := tx.Model(&model.Task{}).Where("group_id = ?", id).Update("group_id", nil).Error; err != nil {
			return err
		}
		return tx.Delete(&model.TaskGroup{}, id).Error
	})
}
