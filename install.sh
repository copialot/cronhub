#!/usr/bin/env bash
set -euo pipefail

# CronHub 一键安装脚本
# 支持: Ubuntu/Debian (systemd), macOS (launchd)

APP_NAME="cronhub"
INSTALL_DIR="/usr/local/bin"
DATA_DIR="/var/lib/cronhub"
CONFIG_DIR="/etc/cronhub"
LOG_DIR="/var/log/cronhub"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

detect_os() {
    case "$(uname -s)" in
        Linux*)  OS="linux" ;;
        Darwin*) OS="darwin" ;;
        *)       err "不支持的操作系统: $(uname -s)" ;;
    esac

    if [ "$OS" = "linux" ]; then
        if [ -f /etc/debian_version ]; then
            DISTRO="debian"
        elif [ -f /etc/lsb-release ] && grep -qi ubuntu /etc/lsb-release; then
            DISTRO="ubuntu"
        else
            DISTRO="linux"
        fi
    else
        DISTRO="macos"
    fi
    info "检测到系统: $DISTRO ($OS/$(uname -m))"
}

check_binary() {
    # 查找二进制文件
    BINARY=""
    if [ -f "./cronhub" ]; then
        BINARY="./cronhub"
    elif [ -f "./server/cronhub" ]; then
        BINARY="./server/cronhub"
    fi

    if [ -z "$BINARY" ]; then
        err "找不到 cronhub 二进制文件，请先运行 make build"
    fi

    info "找到二进制文件: $BINARY"
}

prompt_config() {
    PORT="${CRONHUB_PORT:-8080}"
    AUTH_TOKEN="${CRONHUB_AUTH_TOKEN:-}"

    read -rp "$(echo -e "${CYAN}服务端口 [${PORT}]: ${NC}")" input_port < /dev/tty
    PORT="${input_port:-$PORT}"

    read -rp "$(echo -e "${CYAN}访问口令 (留空不启用鉴权): ${NC}")" input_token < /dev/tty
    AUTH_TOKEN="${input_token:-$AUTH_TOKEN}"
}

install_linux() {
    if [ "$(id -u)" -ne 0 ]; then
        err "Linux 安装需要 root 权限，请使用 sudo 运行"
    fi

    info "安装到 Linux 系统服务 (systemd)..."

    # 创建用户
    if ! id -u "$APP_NAME" >/dev/null 2>&1; then
        useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_NAME"
        ok "创建系统用户: $APP_NAME"
    fi

    # 创建目录
    mkdir -p "$DATA_DIR" "$CONFIG_DIR" "$LOG_DIR"
    chown "$APP_NAME:$APP_NAME" "$DATA_DIR" "$LOG_DIR"

    # 复制二进制
    cp "$BINARY" "$INSTALL_DIR/$APP_NAME"
    chmod +x "$INSTALL_DIR/$APP_NAME"
    ok "二进制安装到: $INSTALL_DIR/$APP_NAME"

    # 写入环境变量配置
    cat > "$CONFIG_DIR/cronhub.env" <<EOF
PORT=${PORT}
DB_PATH=${DATA_DIR}/cronhub.db
DATA_DIR=${DATA_DIR}
AUTH_TOKEN=${AUTH_TOKEN}
EOF
    chmod 600 "$CONFIG_DIR/cronhub.env"
    chown "$APP_NAME:$APP_NAME" "$CONFIG_DIR/cronhub.env"
    ok "配置写入: $CONFIG_DIR/cronhub.env"

    # 写入 systemd unit
    cat > /etc/systemd/system/cronhub.service <<EOF
[Unit]
Description=CronHub - Cron Job Management
After=network.target

[Service]
Type=simple
User=${APP_NAME}
Group=${APP_NAME}
WorkingDirectory=${DATA_DIR}
EnvironmentFile=${CONFIG_DIR}/cronhub.env
ExecStart=${INSTALL_DIR}/${APP_NAME}
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/cronhub.log
StandardError=append:${LOG_DIR}/cronhub.log

# 安全加固
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${DATA_DIR} ${LOG_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
    ok "systemd 服务文件已创建"

    systemctl daemon-reload
    systemctl enable cronhub
    systemctl start cronhub
    ok "服务已启动并设为开机自启"

    echo ""
    ok "安装完成!"
    info "服务地址:   http://localhost:${PORT}"
    info "配置文件:   ${CONFIG_DIR}/cronhub.env"
    info "数据目录:   ${DATA_DIR}"
    info "日志文件:   ${LOG_DIR}/cronhub.log"
    echo ""
    info "常用命令:"
    echo "  sudo systemctl status cronhub    # 查看状态"
    echo "  sudo systemctl restart cronhub   # 重启服务"
    echo "  sudo systemctl stop cronhub      # 停止服务"
    echo "  sudo journalctl -u cronhub -f    # 查看日志"
}

install_macos() {
    info "安装到 macOS 系统服务 (launchd)..."

    MACOS_DATA_DIR="$HOME/.cronhub"
    MACOS_LOG_DIR="$MACOS_DATA_DIR/logs"
    MACOS_CONFIG="$MACOS_DATA_DIR/cronhub.env"
    PLIST_PATH="$HOME/Library/LaunchAgents/com.cronhub.plist"

    # 创建目录
    mkdir -p "$MACOS_DATA_DIR" "$MACOS_LOG_DIR"

    # 复制二进制
    MACOS_BIN="$MACOS_DATA_DIR/cronhub"
    cp "$BINARY" "$MACOS_BIN"
    chmod +x "$MACOS_BIN"
    ok "二进制安装到: $MACOS_BIN"

    # 写入环境变量配置
    cat > "$MACOS_CONFIG" <<EOF
PORT=${PORT}
DB_PATH=${MACOS_DATA_DIR}/cronhub.db
DATA_DIR=${MACOS_DATA_DIR}
AUTH_TOKEN=${AUTH_TOKEN}
EOF
    chmod 600 "$MACOS_CONFIG"
    ok "配置写入: $MACOS_CONFIG"

    # 创建 wrapper 脚本以加载环境变量
    WRAPPER="$MACOS_DATA_DIR/run.sh"
    cat > "$WRAPPER" <<'SCRIPT'
#!/bin/bash
set -a
source "$(dirname "$0")/cronhub.env"
set +a
exec "$(dirname "$0")/cronhub"
SCRIPT
    chmod +x "$WRAPPER"

    # 如果已有旧服务先卸载
    if launchctl list 2>/dev/null | grep -q com.cronhub; then
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
    fi

    # 写入 launchd plist
    cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cronhub</string>
    <key>Program</key>
    <string>${WRAPPER}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${MACOS_LOG_DIR}/cronhub.log</string>
    <key>StandardErrorPath</key>
    <string>${MACOS_LOG_DIR}/cronhub.log</string>
    <key>WorkingDirectory</key>
    <string>${MACOS_DATA_DIR}</string>
</dict>
</plist>
EOF
    ok "launchd plist 已创建"

    launchctl load "$PLIST_PATH"
    ok "服务已启动并设为登录自启"

    echo ""
    ok "安装完成!"
    info "服务地址:   http://localhost:${PORT}"
    info "配置文件:   ${MACOS_CONFIG}"
    info "数据目录:   ${MACOS_DATA_DIR}"
    info "日志文件:   ${MACOS_LOG_DIR}/cronhub.log"
    echo ""
    info "常用命令:"
    echo "  launchctl list | grep cronhub            # 查看状态"
    echo "  launchctl unload ${PLIST_PATH}           # 停止服务"
    echo "  launchctl load ${PLIST_PATH}             # 启动服务"
    echo "  tail -f ${MACOS_LOG_DIR}/cronhub.log     # 查看日志"
}

uninstall_linux() {
    if [ "$(id -u)" -ne 0 ]; then
        err "卸载需要 root 权限"
    fi
    info "卸载 CronHub..."
    systemctl stop cronhub 2>/dev/null || true
    systemctl disable cronhub 2>/dev/null || true
    rm -f /etc/systemd/system/cronhub.service
    systemctl daemon-reload
    rm -f "$INSTALL_DIR/$APP_NAME"
    ok "服务已卸载 (数据保留在 $DATA_DIR)"
}

uninstall_macos() {
    PLIST_PATH="$HOME/Library/LaunchAgents/com.cronhub.plist"
    info "卸载 CronHub..."
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    rm -f "$PLIST_PATH"
    ok "服务已卸载 (数据保留在 $HOME/.cronhub)"
}

usage() {
    echo "CronHub 安装脚本"
    echo ""
    echo "用法: $0 [install|uninstall]"
    echo ""
    echo "  install     安装为系统服务"
    echo "  uninstall   卸载系统服务 (保留数据)"
    echo ""
    echo "环境变量:"
    echo "  CRONHUB_PORT        服务端口 (默认 8080)"
    echo "  CRONHUB_AUTH_TOKEN  访问口令 (留空不启用)"
}

# ---- 主逻辑 ----
ACTION="${1:-install}"

case "$ACTION" in
    install)
        echo -e "${GREEN}"
        echo '   ____                _   _       _     '
        echo '  / ___|_ __ ___  _ __| | | |_   _| |__  '
        echo ' | |   |  __/ _ \|  _ \ |_| | | | |  _ \ '
        echo ' | |___|  | | (_) | | | |  _  | |_| | |_) |'
        echo '  \____|_|  \___/|_| |_|_| |_|\__,_|_.__/ '
        echo -e "${NC}"
        detect_os
        check_binary
        prompt_config
        if [ "$OS" = "darwin" ]; then
            install_macos
        else
            install_linux
        fi
        ;;
    uninstall)
        detect_os
        if [ "$OS" = "darwin" ]; then
            uninstall_macos
        else
            uninstall_linux
        fi
        ;;
    *)
        usage
        exit 1
        ;;
esac
