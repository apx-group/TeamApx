# Stage 1: Frontend mit Bun bauen
FROM oven/bun:latest AS frontend-builder

WORKDIR /frontend
COPY frontend/package.json ./
RUN bun install
COPY frontend/ .
RUN bun run build

# Stage 2: Go-Backend bauen
FROM golang:1.24-alpine AS backend-builder

WORKDIR /build
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/cmd/ ./cmd/
RUN CGO_ENABLED=0 go build -o teamapx-backend ./cmd/

# Stage 3: Finales Image
FROM alpine:3.19
RUN apk add --no-cache ca-certificates libwebp-tools
WORKDIR /app
COPY --from=backend-builder /build/teamapx-backend .
COPY --from=frontend-builder /frontend/dist ./frontend/dist
EXPOSE 8080
CMD ["./teamapx-backend"]
