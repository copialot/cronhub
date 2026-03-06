package repository

import (
	"cronhub/internal/model"

	"gorm.io/gorm"
)

type AlertConfigRepo struct {
	db *gorm.DB
}

func NewAlertConfigRepo(db *gorm.DB) *AlertConfigRepo {
	return &AlertConfigRepo{db: db}
}

func (r *AlertConfigRepo) List() ([]model.AlertConfig, error) {
	var configs []model.AlertConfig
	err := r.db.Preload("Task").Order("id DESC").Find(&configs).Error
	return configs, err
}

func (r *AlertConfigRepo) GetByID(id uint) (*model.AlertConfig, error) {
	var config model.AlertConfig
	err := r.db.Preload("Task").First(&config, id).Error
	return &config, err
}

func (r *AlertConfigRepo) Create(config *model.AlertConfig) error {
	return r.db.Create(config).Error
}

func (r *AlertConfigRepo) Update(config *model.AlertConfig) error {
	return r.db.Save(config).Error
}

func (r *AlertConfigRepo) Delete(id uint) error {
	return r.db.Delete(&model.AlertConfig{}, id).Error
}

func (r *AlertConfigRepo) FindForTask(taskID uint) ([]model.AlertConfig, error) {
	var configs []model.AlertConfig
	// 查找特定任务的告警 + 全局告警
	err := r.db.Where("(task_id = ? OR task_id IS NULL) AND enabled = ?", taskID, true).Find(&configs).Error
	return configs, err
}
