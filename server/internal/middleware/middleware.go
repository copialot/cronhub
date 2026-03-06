package middleware

import (
	"crypto/subtle"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		log.Printf("[%d] %s %s (%v)", status, c.Request.Method, path, latency)
	}
}

func Recovery() gin.HandlerFunc {
	return gin.Recovery()
}

// TokenAuth 简单口令鉴权中间件
// 客户端通过 Authorization: Bearer <token> 或 cookie cronhub_token=<token> 传递口令
// 提供 /api/v1/auth/login 和 /api/v1/auth/check 两个端点无需鉴权
func TokenAuth(token string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if token == "" {
			c.Next()
			return
		}

		path := c.Request.URL.Path

		// 健康检查、登录接口、静态文件不需要鉴权
		if path == "/health" || path == "/api/v1/auth/login" || path == "/api/v1/auth/check" {
			c.Next()
			return
		}

		// 非 API 请求（前端静态文件）不拦截
		if len(path) < 5 || path[:5] != "/api/" {
			c.Next()
			return
		}

		// 从 header 取 token
		provided := ""
		if auth := c.GetHeader("Authorization"); len(auth) > 7 && auth[:7] == "Bearer " {
			provided = auth[7:]
		}

		// 从 cookie 取 token
		if provided == "" {
			if cookie, err := c.Cookie("cronhub_token"); err == nil {
				provided = cookie
			}
		}

		if provided == "" || subtle.ConstantTimeCompare([]byte(provided), []byte(token)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权，请先登录"})
			return
		}

		c.Next()
	}
}
