package repository

import (
	"cronhub/internal/model"

	"gorm.io/gorm"
)

type ScriptRepo struct {
	db *gorm.DB
}

func NewScriptRepo(db *gorm.DB) *ScriptRepo {
	return &ScriptRepo{db: db}
}

func (r *ScriptRepo) List() ([]model.Script, error) {
	var scripts []model.Script
	err := r.db.Order("id DESC").Find(&scripts).Error
	return scripts, err
}

func (r *ScriptRepo) GetByID(id uint) (*model.Script, error) {
	var script model.Script
	err := r.db.First(&script, id).Error
	return &script, err
}

func (r *ScriptRepo) GetByName(name string) (*model.Script, error) {
	var script model.Script
	err := r.db.Where("name = ?", name).First(&script).Error
	return &script, err
}

func (r *ScriptRepo) Create(script *model.Script) error {
	return r.db.Create(script).Error
}

func (r *ScriptRepo) Update(script *model.Script) error {
	return r.db.Save(script).Error
}

func (r *ScriptRepo) Delete(id uint) error {
	return r.db.Delete(&model.Script{}, id).Error
}
