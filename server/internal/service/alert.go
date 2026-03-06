package service

import (
	"log"

	"cronhub/internal/model"
	"cronhub/internal/repository"
	"cronhub/pkg/notifier"
)

type AlertService struct {
	alertRepo *repository.AlertConfigRepo
	notifiers map[model.AlertType]notifier.Notifier
}

func NewAlertService(alertRepo *repository.AlertConfigRepo) *AlertService {
	return &AlertService{
		alertRepo: alertRepo,
		notifiers: map[model.AlertType]notifier.Notifier{
			model.AlertTypeWebhook: &notifier.WebhookNotifier{},
		},
	}
}

func (s *AlertService) SetEmailNotifier(n notifier.Notifier) {
	s.notifiers[model.AlertTypeEmail] = n
}

func (s *AlertService) Check(task *model.Task, execLog *model.ExecutionLog) {
	configs, err := s.alertRepo.FindForTask(task.ID)
	if err != nil {
		log.Printf("查询告警配置失败: %v", err)
		return
	}

	for _, cfg := range configs {
		shouldNotify := false
		switch execLog.Status {
		case model.ExecStatusFailed:
			shouldNotify = cfg.OnFailure
		case model.ExecStatusTimeout:
			shouldNotify = cfg.OnTimeout
		case model.ExecStatusSuccess:
			shouldNotify = cfg.OnSuccess
		}

		if !shouldNotify {
			continue
		}

		n, ok := s.notifiers[cfg.Type]
		if !ok {
			log.Printf("未找到通知器类型: %s", cfg.Type)
			continue
		}

		msg := notifier.Message{
			TaskName:  task.Name,
			Status:    string(execLog.Status),
			Output:    execLog.Output,
			Error:     execLog.ErrorOutput,
			Duration:  execLog.DurationMs,
			Endpoint:  cfg.Endpoint,
		}

		if err := n.Send(msg); err != nil {
			log.Printf("发送告警失败 [%s -> %s]: %v", cfg.Type, cfg.Endpoint, err)
		}
	}
}
