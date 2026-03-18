FROM golang:1.24-alpine AS builder

WORKDIR /build
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/cmd/ ./cmd/
RUN CGO_ENABLED=0 go build -o teamapx-backend ./cmd/

FROM alpine:3.19
RUN apk add --no-cache ca-certificates libwebp-tools
WORKDIR /app
COPY --from=builder /build/teamapx-backend .
EXPOSE 8080
CMD ["./teamapx-backend"]
