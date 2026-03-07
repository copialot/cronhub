package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port             int
	DBPath           string
	DataDir          string
	AuthToken        string // 口令鉴权，为空则不启用
	SMTPHost         string
	SMTPPort         int
	SMTPUser         string
	SMTPPass         string
	SMTPFrom         string
	LogRetentionDays int // 执行日志保留天数，默认 30
}

func Load() *Config {
	return &Config{
		Port:             getEnvInt("PORT", 8080),
		DBPath:           getEnv("DB_PATH", "./data/cronhub.db"),
		DataDir:          getEnv("DATA_DIR", "./data"),
		AuthToken:        getEnv("AUTH_TOKEN", ""),
		SMTPHost:         getEnv("SMTP_HOST", ""),
		SMTPPort:         getEnvInt("SMTP_PORT", 587),
		SMTPUser:         getEnv("SMTP_USER", ""),
		SMTPPass:         getEnv("SMTP_PASS", ""),
		SMTPFrom:         getEnv("SMTP_FROM", ""),
		LogRetentionDays: getEnvInt("LOG_RETENTION_DAYS", 30),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
