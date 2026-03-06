# CronHub

A modern, self-hosted cron job management system with a web UI.

[中文文档](./README_CN.md)

![Go](https://img.shields.io/badge/Go-1.23-blue)
![React](https://img.shields.io/badge/React-19-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Visual Cron Management** — Create, edit, and manage cron jobs through an intuitive web interface
- **Real-time Log Streaming** — Watch execution output in real-time via WebSocket
- **Execution History** — Full history with status tracking, duration, and exit codes
- **Dashboard & Statistics** — Overview of success rates, daily execution charts, and recent activity
- **Task Groups** — Organize tasks with color-coded groups
- **Alerting** — Email and webhook notifications on failure, timeout, or success
- **Dark / Light Theme** — Industrial terminal-style dark theme with a clean light alternative
- **i18n** — English, Simplified Chinese, and Traditional Chinese with automatic browser detection
- **Single Binary** — Frontend embedded into the Go binary; deploy anywhere with zero dependencies
- **Docker Ready** — Multi-stage Dockerfile and docker-compose included

## Quick Install

Download the latest release and install as a system service:

```bash
# Linux (amd64)
curl -fsSL https://github.com/copialot/cronhub/releases/latest/download/cronhub-linux-amd64.tar.gz | tar xz
sudo bash install.sh install

# Linux (arm64)
curl -fsSL https://github.com/copialot/cronhub/releases/latest/download/cronhub-linux-arm64.tar.gz | tar xz
sudo bash install.sh install

# macOS (Apple Silicon)
curl -fsSL https://github.com/copialot/cronhub/releases/latest/download/cronhub-darwin-arm64.tar.gz | tar xz
bash install.sh install

# macOS (Intel)
curl -fsSL https://github.com/copialot/cronhub/releases/latest/download/cronhub-darwin-amd64.tar.gz | tar xz
bash install.sh install
```

The installer will prompt for a port and optional access token, then configure the service (systemd on Linux, launchd on macOS).

## Docker

```bash
docker compose up -d
```

Or build manually:

```bash
docker build -t cronhub .
docker run -d -p 8080:8080 -v cronhub-data:/app/data cronhub
```

## Development

Prerequisites: Go 1.23+, Node.js 22+, pnpm

```bash
# Start both frontend and backend in dev mode
make dev

# Build single binary
make build

# Run the built binary
./cronhub
```

## Configuration

All configuration is done via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DB_PATH` | `data/cronhub.db` | SQLite database path |
| `DATA_DIR` | `data` | Data directory |
| `AUTH_TOKEN` | *(empty)* | Access token (disabled if empty) |
| `SMTP_HOST` | | SMTP server for email alerts |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | | SMTP username |
| `SMTP_PASS` | | SMTP password |
| `SMTP_FROM` | | Sender email address |

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────┐
│  Browser     │────▶│  Go Binary (Gin)                 │
│  React SPA   │◀────│  ├── REST API (/api/v1/*)        │
│              │ WS  │  ├── WebSocket (/ws/*)            │
│              │◀───▶│  ├── Embedded Frontend (go:embed) │
└─────────────┘     │  ├── Scheduler (robfig/cron)      │
                    │  ├── Executor (os/exec)            │
                    │  └── SQLite (GORM + WAL)           │
                    └──────────────────────────────────┘
```

## License

MIT
