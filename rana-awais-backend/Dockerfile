# ============================================================
# 🏗️ STAGE 1: BUILD
# ============================================================
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy dependency files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a statically linked binary
# Note: CGO_ENABLED=1 is required for go-sqlite3 (sync log repo)
# When USE_MONGO_DB=true, SQLite is only used for local sync tracking
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
    go build -tags netgo -ldflags '-s -w -extldflags "-static"' -o app ./cmd/server/main.go

# ============================================================
# 🏗️ STAGE 2: RUNTIME (Minimal Image)
# ============================================================
FROM alpine:3.19

# Install CA certificates for HTTPS calls
RUN apk add --no-cache ca-certificates tzdata

# Set timezone to Pakistan
ENV TZ=Asia/Karachi

WORKDIR /app

# Copy only the binary from builder stage
COPY --from=builder /app/app .

# Create a non-root user for security
RUN adduser -D -h /app appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ./app health || exit 1

EXPOSE 8080

CMD ["./app"]
