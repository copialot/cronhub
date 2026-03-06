package handler

import (
	"net/http"

	"cronhub/internal/model"
	"cronhub/internal/repository"

	"github.com/gin-gonic/gin"
)

type GroupHandler struct {
	repo *repository.TaskGroupRepo
}

func NewGroupHandler(repo *repository.TaskGroupRepo) *GroupHandler {
	return &GroupHandler{repo: repo}
}

func (h *GroupHandler) List(c *gin.Context) {
	groups, err := h.repo.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, groups)
}

type groupRequest struct {
	Name      string `json:"name" binding:"required"`
	Color     string `json:"color"`
	SortOrder int    `json:"sort_order"`
}

func (h *GroupHandler) Create(c *gin.Context) {
	var req groupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group := &model.TaskGroup{
		Name:      req.Name,
		Color:     req.Color,
		SortOrder: req.SortOrder,
	}
	if group.Color == "" {
		group.Color = "#00d4aa"
	}

	if err := h.repo.Create(group); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, group)
}

func (h *GroupHandler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	group, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "分组不存在"})
		return
	}

	var req groupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group.Name = req.Name
	if req.Color != "" {
		group.Color = req.Color
	}
	group.SortOrder = req.SortOrder

	if err := h.repo.Update(group); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, group)
}

func (h *GroupHandler) Delete(c *gin.Context) {
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
