# Stage 1: 构建前端
FROM node:22-alpine AS frontend
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ .
RUN pnpm build

# Stage 2: 构建后端
FROM golang:1.23-alpine AS backend
RUN apk add --no-cache gcc musl-dev
WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ .
COPY --from=frontend /app/web/../server/static/dist ./static/dist/
RUN CGO_ENABLED=1 go build -o /cronhub .

# Stage 3: 最终镜像
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata bash curl
WORKDIR /app
COPY --from=backend /cronhub .
RUN mkdir -p /app/data

ENV PORT=8080
ENV DB_PATH=/app/data/cronhub.db
EXPOSE 8080
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["./cronhub"]
