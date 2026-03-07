package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"cronhub/internal/model"
	"cronhub/internal/repository"
)

var langExtMap = map[string]string{
	"shell":  "sh",
	"python": "py",
	"node":   "js",
}

var langInterpreterMap = map[string]string{
	"shell":  "sh",
	"python": "python3",
	"node":   "node",
}

type ScriptService struct {
	repo       *repository.ScriptRepo
	scriptsDir string
}

func NewScriptService(repo *repository.ScriptRepo, dataDir string) *ScriptService {
	dir := filepath.Join(dataDir, "scripts")
	_ = os.MkdirAll(dir, 0755)
	return &ScriptService{repo: repo, scriptsDir: dir}
}

func (s *ScriptService) List() ([]model.Script, error) {
	return s.repo.List()
}

func (s *ScriptService) GetByID(id uint) (*model.Script, error) {
	return s.repo.GetByID(id)
}

func (s *ScriptService) GetByName(name string) (*model.Script, error) {
	return s.repo.GetByName(name)
}

func (s *ScriptService) Create(name, language, description, content string) (*model.Script, error) {
	ext := langExtMap[language]
	if ext == "" {
		ext = "sh"
	}

	// 先创建 DB 记录获取 ID
	script := &model.Script{
		Name:        name,
		Language:    language,
		Description: description,
		Filename:    "placeholder",
	}
	if err := s.repo.Create(script); err != nil {
		return nil, err
	}

	// 生成文件名并写入磁盘
	safeName := sanitizeFilename(name)
	filename := fmt.Sprintf("%d_%s.%s", script.ID, safeName, ext)
	filePath := filepath.Join(s.scriptsDir, filename)

	if err := os.WriteFile(filePath, []byte(content), 0755); err != nil {
		s.repo.Delete(script.ID)
		return nil, err
	}

	script.Filename = filename
	if err := s.repo.Update(script); err != nil {
		os.Remove(filePath)
		return nil, err
	}

	return script, nil
}

func (s *ScriptService) Update(id uint, name, language, description, content string) (*model.Script, error) {
	script, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// 删除旧文件
	oldPath := filepath.Join(s.scriptsDir, script.Filename)
	os.Remove(oldPath)

	ext := langExtMap[language]
	if ext == "" {
		ext = "sh"
	}

	safeName := sanitizeFilename(name)
	filename := fmt.Sprintf("%d_%s.%s", script.ID, safeName, ext)
	filePath := filepath.Join(s.scriptsDir, filename)

	if err := os.WriteFile(filePath, []byte(content), 0755); err != nil {
		return nil, err
	}

	script.Name = name
	script.Language = language
	script.Description = description
	script.Filename = filename

	if err := s.repo.Update(script); err != nil {
		return nil, err
	}

	return script, nil
}

func (s *ScriptService) Delete(id uint) error {
	script, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	filePath := filepath.Join(s.scriptsDir, script.Filename)
	os.Remove(filePath)

	return s.repo.Delete(id)
}

func (s *ScriptService) GetContent(script *model.Script) (string, error) {
	filePath := filepath.Join(s.scriptsDir, script.Filename)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (s *ScriptService) GetScriptPath(script *model.Script) string {
	return filepath.Join(s.scriptsDir, script.Filename)
}

func (s *ScriptService) GetInterpreter(language string) string {
	if interp, ok := langInterpreterMap[language]; ok {
		return interp
	}
	return "sh"
}

func sanitizeFilename(name string) string {
	replacer := strings.NewReplacer(" ", "_", "/", "_", "\\", "_", ":", "_", "*", "_", "?", "_", "\"", "_", "<", "_", ">", "_", "|", "_")
	return replacer.Replace(name)
}
