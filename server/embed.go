package main

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed static/dist/*
var staticFS embed.FS

func setupStaticFiles(r *gin.Engine) {
	distFS, err := fs.Sub(staticFS, "static/dist")
	if err != nil {
		// 开发模式下可能没有嵌入文件，跳过
		return
	}

	// 检查是否有嵌入文件
	entries, err := fs.ReadDir(distFS, ".")
	if err != nil || len(entries) == 0 {
		return
	}

	fileServer := http.FileServer(http.FS(distFS))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// API 和 WebSocket 请求不处理
		if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/health") {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}

		// 尝试提供静态文件
		if f, err := distFS.Open(strings.TrimPrefix(path, "/")); err == nil {
			f.Close()
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}

		// SPA fallback: 返回 index.html
		c.Request.URL.Path = "/"
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
}
