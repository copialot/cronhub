package handler

import (
	"net/http"
	"strconv"

	"cronhub/internal/repository"

	"github.com/gin-gonic/gin"
)

type StatsHandler struct {
	logRepo *repository.ExecutionLogRepo
}

func NewStatsHandler(logRepo *repository.ExecutionLogRepo) *StatsHandler {
	return &StatsHandler{logRepo: logRepo}
}

func (h *StatsHandler) Overview(c *gin.Context) {
	stats, err := h.logRepo.GetStatsOverview()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *StatsHandler) TaskStats(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	stats, err := h.logRepo.GetTaskStats(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *StatsHandler) Chart(c *gin.Context) {
	days := 7
	if r := c.Query("range"); r != "" {
		// 解析 "7d", "14d", "30d" 格式
		if len(r) > 1 && r[len(r)-1] == 'd' {
			if n, err := strconv.Atoi(r[:len(r)-1]); err == nil && n > 0 {
				days = n
			}
		}
	}

	data, err := h.logRepo.GetDailyStats(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}
