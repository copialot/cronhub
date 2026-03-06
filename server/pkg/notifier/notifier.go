package notifier

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	"time"
)

type Message struct {
	TaskName string `json:"task_name"`
	Status   string `json:"status"`
	Output   string `json:"output"`
	Error    string `json:"error"`
	Duration int64  `json:"duration_ms"`
	Endpoint string `json:"-"`
}

type Notifier interface {
	Send(msg Message) error
}

// WebhookNotifier 通过 HTTP POST 发送告警
type WebhookNotifier struct{}

func (w *WebhookNotifier) Send(msg Message) error {
	payload := map[string]interface{}{
		"task_name":   msg.TaskName,
		"status":      msg.Status,
		"output":      truncateStr(msg.Output, 1000),
		"error":       truncateStr(msg.Error, 1000),
		"duration_ms": msg.Duration,
		"timestamp":   time.Now().Format(time.RFC3339),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(msg.Endpoint, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook 返回状态码: %d", resp.StatusCode)
	}
	return nil
}

// EmailNotifier 通过 SMTP 发送邮件
type EmailNotifier struct {
	Host string
	Port int
	User string
	Pass string
	From string
}

func (e *EmailNotifier) Send(msg Message) error {
	subject := fmt.Sprintf("CronHub 告警: 任务 [%s] %s", msg.TaskName, msg.Status)
	body := fmt.Sprintf("任务: %s\n状态: %s\n耗时: %dms\n\n输出:\n%s\n\n错误:\n%s",
		msg.TaskName, msg.Status, msg.Duration,
		truncateStr(msg.Output, 2000),
		truncateStr(msg.Error, 2000),
	)

	message := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		e.From, msg.Endpoint, subject, body)

	auth := smtp.PlainAuth("", e.User, e.Pass, e.Host)
	addr := fmt.Sprintf("%s:%d", e.Host, e.Port)
	return smtp.SendMail(addr, auth, e.From, []string{msg.Endpoint}, []byte(message))
}

func truncateStr(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}
