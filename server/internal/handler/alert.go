package handler

import (
	"net/http"

	"cronhub/internal/model"
	"cronhub/internal/repository"
	"cronhub/pkg/notifier"

	"github.com/gin-gonic/gin"
)

type AlertHandler struct {
	repo *repository.AlertConfigRepo
}

func NewAlertHandler(repo *repository.AlertConfigRepo) *AlertHandler {
	return &AlertHandler{repo: repo}
}

func (h *AlertHandler) List(c *gin.Context) {
	configs, err := h.repo.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, configs)
}

type alertRequest struct {
	TaskID    *uint           `json:"task_id"`
	Type      model.AlertType `json:"type" binding:"required"`
	Endpoint  string          `json:"endpoint" binding:"required"`
	OnFailure *bool           `json:"on_failure"`
	OnTimeout *bool           `json:"on_timeout"`
	OnSuccess *bool           `json:"on_success"`
	Enabled   *bool           `json:"enabled"`
}

func (h *AlertHandler) Create(c *gin.Context) {
	var req alertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config := &model.AlertConfig{
		TaskID:    req.TaskID,
		Type:      req.Type,
		Endpoint:  req.Endpoint,
		OnFailure: boolDefault(req.OnFailure, true),
		OnTimeout: boolDefault(req.OnTimeout, true),
		OnSuccess: boolDefault(req.OnSuccess, false),
		Enabled:   boolDefault(req.Enabled, true),
	}

	if err := h.repo.Create(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, config)
}

func (h *AlertHandler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	config, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "告警配置不存在"})
		return
	}

	var req alertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.TaskID = req.TaskID
	config.Type = req.Type
	config.Endpoint = req.Endpoint
	if req.OnFailure != nil {
		config.OnFailure = *req.OnFailure
	}
	if req.OnTimeout != nil {
		config.OnTimeout = *req.OnTimeout
	}
	if req.OnSuccess != nil {
		config.OnSuccess = *req.OnSuccess
	}
	if req.Enabled != nil {
		config.Enabled = *req.Enabled
	}

	if err := h.repo.Update(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

func (h *AlertHandler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

func (h *AlertHandler) Test(c *gin.Context) {
	var req struct {
		Type     model.AlertType `json:"type" binding:"required"`
		Endpoint string          `json:"endpoint" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := notifier.Message{
		TaskName: "测试任务",
		Status:   "success",
		Output:   "这是一条测试告警消息",
		Duration: 1234,
		Endpoint: req.Endpoint,
	}

	var n notifier.Notifier
	switch req.Type {
	case model.AlertTypeWebhook:
		n = &notifier.WebhookNotifier{}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的告警类型"})
		return
	}

	if err := n.Send(msg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "测试发送成功"})
}

func boolDefault(b *bool, def bool) bool {
	if b == nil {
		return def
	}
	return *b
}
