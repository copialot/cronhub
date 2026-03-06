package cronutil

import (
	"fmt"
	"strings"
	"time"

	"github.com/robfig/cron/v3"
)

var parser = cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)

// Validate 验证 cron 表达式是否合法
func Validate(expr string) error {
	_, err := parser.Parse(expr)
	if err != nil {
		return fmt.Errorf("无效的 cron 表达式: %w", err)
	}
	return nil
}

// NextN 返回接下来 N 次执行时间
func NextN(expr string, n int) ([]time.Time, error) {
	schedule, err := parser.Parse(expr)
	if err != nil {
		return nil, err
	}
	times := make([]time.Time, 0, n)
	t := time.Now()
	for i := 0; i < n; i++ {
		t = schedule.Next(t)
		times = append(times, t)
	}
	return times, nil
}

// Next 返回下一次执行时间
func Next(expr string) (*time.Time, error) {
	schedule, err := parser.Parse(expr)
	if err != nil {
		return nil, err
	}
	t := schedule.Next(time.Now())
	return &t, nil
}

// Describe 返回 cron 表达式的可读描述
func Describe(expr string) string {
	parts := strings.Fields(expr)
	if len(parts) != 5 {
		return expr
	}
	// 简单描述，后续可扩展
	return fmt.Sprintf("分:%s 时:%s 日:%s 月:%s 周:%s", parts[0], parts[1], parts[2], parts[3], parts[4])
}

// GetParser 返回解析器供 scheduler 使用
func GetParser() cron.Parser {
	return parser
}
