package handler

import (
	"net/http"

	"cronhub/internal/service"

	"github.com/gin-gonic/gin"
)

type ScriptHandler struct {
	svc *service.ScriptService
}

func NewScriptHandler(svc *service.ScriptService) *ScriptHandler {
	return &ScriptHandler{svc: svc}
}

func (h *ScriptHandler) List(c *gin.Context) {
	scripts, err := h.svc.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, scripts)
}

type createScriptRequest struct {
	Name        string `json:"name" binding:"required"`
	Language    string `json:"language" binding:"required"`
	Description string `json:"description"`
	Content     string `json:"content"`
}

func (h *ScriptHandler) Create(c *gin.Context) {
	var req createScriptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	script, err := h.svc.Create(req.Name, req.Language, req.Description, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, script)
}

func (h *ScriptHandler) Get(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	script, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "脚本不存在"})
		return
	}

	content, err := h.svc.GetContent(script)
	if err != nil {
		content = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          script.ID,
		"name":        script.Name,
		"language":    script.Language,
		"description": script.Description,
		"filename":    script.Filename,
		"content":     content,
		"created_at":  script.CreatedAt,
		"updated_at":  script.UpdatedAt,
	})
}

func (h *ScriptHandler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	var req createScriptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	script, err := h.svc.Update(id, req.Name, req.Language, req.Description, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, script)
}

func (h *ScriptHandler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	if err := h.svc.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}
