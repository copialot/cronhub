.PHONY: dev dev-server dev-web build clean docker install uninstall

# 开发模式 - 同时启动前后端
dev:
	@echo "启动开发模式..."
	@make dev-server & make dev-web

dev-server:
	cd server && go run .

dev-web:
	cd web && pnpm dev

# 构建前端
build-web:
	cd web && pnpm build

# 构建后端 (嵌入前端)
build: build-web
	cd server && CGO_ENABLED=1 go build -o ../cronhub .

# 运行构建产物
run: build
	./cronhub

# 安装为系统服务
install: build
	@bash install.sh install

# 卸载系统服务
uninstall:
	@bash install.sh uninstall

# Docker 构建
docker:
	docker build -t cronhub .

# Docker Compose
up:
	docker compose up -d

down:
	docker compose down

# 清理
clean:
	rm -f cronhub
	rm -rf server/static/dist/*
	cd web && rm -rf node_modules
