package main

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"cronhub/cmd"
	"cronhub/config"
	"cronhub/db"
	"cronhub/internal/handler"
	"cronhub/internal/middleware"
	"cronhub/internal/repository"
	"cronhub/internal/service"
	"cronhub/internal/ws"
	"cronhub/pkg/notifier"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Version 通过 ldflags 注入
var Version = "dev"

func main() {
	// 子命令分发
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "update":
			cmd.RunUpdate(Version)
			return
		case "version":
			fmt.Printf("CronHub %s\n", Version)
			return
		}
	}

	cfg := config.Load()

	// 初始化数据库
	database := db.Init(cfg.DBPath)

	// 初始化 WebSocket Hub
	hub := ws.NewHub()

	// 初始化 repositories
	taskRepo := repository.NewTaskRepo(database)
	groupRepo := repository.NewTaskGroupRepo(database)
	logRepo := repository.NewExecutionLogRepo(database)
	alertRepo := repository.NewAlertConfigRepo(database)

	// 初始化 repositories (scripts)
	scriptRepo := repository.NewScriptRepo(database)

	// 初始化 services
	alertSvc := service.NewAlertService(alertRepo)
	executor := service.NewExecutor(taskRepo, logRepo, hub, alertSvc)
	scriptSvc := service.NewScriptService(scriptRepo, cfg.DataDir)
	executor.SetScriptService(scriptSvc)
	scheduler := service.NewScheduler(taskRepo, executor, logRepo, cfg.LogRetentionDays)

	// 配置邮件通知
	if cfg.SMTPHost != "" {
		alertSvc.SetEmailNotifier(&notifier.EmailNotifier{
			Host: cfg.SMTPHost,
			Port: cfg.SMTPPort,
			User: cfg.SMTPUser,
			Pass: cfg.SMTPPass,
			From: cfg.SMTPFrom,
		})
	}

	// 启动调度器
	if err := scheduler.Start(); err != nil {
		log.Fatalf("启动调度器失败: %v", err)
	}

	// 初始化 handlers
	taskHandler := handler.NewTaskHandler(taskRepo, scheduler, executor)
	groupHandler := handler.NewGroupHandler(groupRepo)
	execHandler := handler.NewExecutionHandler(logRepo)
	statsHandler := handler.NewStatsHandler(logRepo)
	alertHandler := handler.NewAlertHandler(alertRepo)
	wsHandler := handler.NewWSHandler(hub)
	scriptHandler := handler.NewScriptHandler(scriptSvc)

	// 设置 Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(middleware.Logger(), middleware.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:    []string{"*"},
		AllowMethods:    []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowWebSockets: true,
	}))

	// 口令鉴权
	r.Use(middleware.TokenAuth(cfg.AuthToken))

	// API 路由
	api := r.Group("/api/v1")
	{
		// 鉴权
		api.POST("/auth/login", func(c *gin.Context) {
			if cfg.AuthToken == "" {
				c.JSON(http.StatusOK, gin.H{"ok": true})
				return
			}
			var req struct {
				Token string `json:"token"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "请提供口令"})
				return
			}
			hash := sha256.Sum256([]byte(req.Token))
			hashedInput := hex.EncodeToString(hash[:])
			if subtle.ConstantTimeCompare([]byte(hashedInput), []byte(cfg.AuthToken)) != 1 {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "口令错误"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"ok": true, "token": hashedInput})
		})
		api.GET("/auth/check", func(c *gin.Context) {
			// 若无鉴权直接返回
			if cfg.AuthToken == "" {
				c.JSON(http.StatusOK, gin.H{"auth_required": false})
				return
			}
			// 检查当前请求是否已通过鉴权
			provided := ""
			if auth := c.GetHeader("Authorization"); len(auth) > 7 && auth[:7] == "Bearer " {
				provided = auth[7:]
			}
			if provided == "" {
				if cookie, err := c.Cookie("cronhub_token"); err == nil {
					provided = cookie
				}
			}
			ok := provided != "" && subtle.ConstantTimeCompare([]byte(provided), []byte(cfg.AuthToken)) == 1
			c.JSON(http.StatusOK, gin.H{"auth_required": true, "authenticated": ok})
		})

		// 版本信息
		api.GET("/version", func(c *gin.Context) {
			info := cmd.CheckVersion(Version)
			c.JSON(http.StatusOK, info)
		})

		// 任务
		api.GET("/tasks", taskHandler.List)
		api.POST("/tasks", taskHandler.Create)
		api.GET("/tasks/:id", taskHandler.Get)
		api.PUT("/tasks/:id", taskHandler.Update)
		api.DELETE("/tasks/:id", taskHandler.Delete)
		api.PATCH("/tasks/:id/toggle", taskHandler.Toggle)
		api.POST("/tasks/:id/run", taskHandler.Run)

		// 分组
		api.GET("/groups", groupHandler.List)
		api.POST("/groups", groupHandler.Create)
		api.PUT("/groups/:id", groupHandler.Update)
		api.DELETE("/groups/:id", groupHandler.Delete)

		// 执行记录
		api.GET("/tasks/:id/executions", execHandler.ListByTask)
		api.GET("/executions/:id", execHandler.Get)
		api.GET("/executions/recent", execHandler.Recent)
		api.GET("/executions", execHandler.ListAll)

		// 统计
		api.GET("/stats/overview", statsHandler.Overview)
		api.GET("/stats/tasks/:id", statsHandler.TaskStats)
		api.GET("/stats/chart", statsHandler.Chart)

		// 脚本
		api.GET("/scripts", scriptHandler.List)
		api.POST("/scripts", scriptHandler.Create)
		api.GET("/scripts/:id", scriptHandler.Get)
		api.PUT("/scripts/:id", scriptHandler.Update)
		api.DELETE("/scripts/:id", scriptHandler.Delete)

		// 告警
		api.GET("/alerts", alertHandler.List)
		api.POST("/alerts", alertHandler.Create)
		api.PUT("/alerts/:id", alertHandler.Update)
		api.DELETE("/alerts/:id", alertHandler.Delete)
		api.POST("/alerts/test", alertHandler.Test)

		// WebSocket
		api.GET("/ws/logs/:id", wsHandler.LogStream)
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 嵌入式前端静态文件服务 (生产模式)
	setupStaticFiles(r)

	// 优雅关闭
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("正在关闭...")
		scheduler.Stop()
		os.Exit(0)
	}()

	if cfg.AuthToken != "" {
		log.Println("口令鉴权已启用")
	}
	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("CronHub %s 启动在 %s", Version, addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("启动服务器失败: %v", err)
	}
}
