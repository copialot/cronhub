package handler

import (
	"net/http"
	"strconv"
	"time"

	"cronhub/internal/repository"

	"github.com/gin-gonic/gin"
)

type ExecutionHandler struct {
	repo *repository.ExecutionLogRepo
}

func NewExecutionHandler(repo *repository.ExecutionLogRepo) *ExecutionHandler {
	return &ExecutionHandler{repo: repo}
}

func (h *ExecutionHandler) ListByTask(c *gin.Context) {
	taskID, err := parseID(c)
	if err != nil {
		return
	}

	limit, offset := parsePagination(c)
	logs, total, err := h.repo.ListByTaskID(taskID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
	})
}

func (h *ExecutionHandler) Get(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	log, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "执行记录不存在"})
		return
	}
	c.JSON(http.StatusOK, log)
}

func (h *ExecutionHandler) Recent(c *gin.Context) {
	limit := 20
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	logs, err := h.repo.ListRecent(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *ExecutionHandler) ListAll(c *gin.Context) {
	limit, offset := parsePagination(c)

	var status *string
	if s := c.Query("status"); s != "" {
		status = &s
	}

	var from, to *time.Time
	if f := c.Query("from"); f != "" {
		if t, err := time.Parse("2006-01-02", f); err == nil {
			from = &t
		}
	}
	if t := c.Query("to"); t != "" {
		if parsed, err := time.Parse("2006-01-02", t); err == nil {
			end := parsed.Add(24*time.Hour - time.Second)
			to = &end
		}
	}

	logs, total, err := h.repo.ListAll(status, from, to, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
	})
}

func parsePagination(c *gin.Context) (limit, offset int) {
	limit = 20
	offset = 0

	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	if o := c.Query("offset"); o != "" {
		if n, err := strconv.Atoi(o); err == nil && n >= 0 {
			offset = n
		}
	}
	return
}
