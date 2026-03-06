# CronHub

现代化、自托管的定时任务管理系统，提供 Web 管理界面。

[English](./README.md)

## 功能特性

- **可视化 Cron 管理** — 通过直观的 Web 界面创建、编辑和管理定时任务
- **实时日志流** — 通过 WebSocket 实时查看执行输出
- **执行历史** — 完整的执行记录，包含状态、耗时和退出码
- **仪表盘与统计** — 成功率趋势、每日执行图表和最近活动概览
- **任务分组** — 使用彩色分组组织任务
- **告警通知** — 支持邮件和 Webhook 通知（失败、超时、成功）
- **暗/亮主题** — 工业终端风格暗色主题 + 简洁亮色主题
- **国际化** — 支持英文、简体中文、繁体中文，自动检测浏览器语言
- **单文件部署** — 前端嵌入 Go 二进制文件，零依赖部署
- **Docker 支持** — 包含多阶段 Dockerfile 和 docker-compose

## 快速安装

自动检测系统和架构，下载最新版本并安装为系统服务：

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/copialot/cronhub/main/get.sh)"
```

安装程序会提示设置端口和可选的访问口令，然后配置系统服务（Linux 使用 systemd，macOS 使用 launchd）。

## Docker 部署

```bash
docker compose up -d
```

或手动构建：

```bash
docker build -t cronhub .
docker run -d -p 8080:8080 -v cronhub-data:/app/data cronhub
```

## 开发

依赖：Go 1.23+、Node.js 22+、pnpm

```bash
# 启动前后端开发模式
make dev

# 构建单二进制文件
make build

# 运行
./cronhub
```

## 配置

通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | HTTP 服务端口 |
| `DB_PATH` | `data/cronhub.db` | SQLite 数据库路径 |
| `DATA_DIR` | `data` | 数据目录 |
| `AUTH_TOKEN` | *(空)* | 访问口令（为空则不启用鉴权） |
| `SMTP_HOST` | | SMTP 邮件服务器 |
| `SMTP_PORT` | `587` | SMTP 端口 |
| `SMTP_USER` | | SMTP 用户名 |
| `SMTP_PASS` | | SMTP 密码 |
| `SMTP_FROM` | | 发件人邮箱 |

## 许可证

MIT
