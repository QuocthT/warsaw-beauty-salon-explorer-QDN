# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app
COPY . .
RUN gradle shadowJar --no-daemon

# ── Stage 2: Run ──────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the fat JAR from the build stage
COPY --from=builder /app/build/libs/salon-explorer.jar .

# The data directory is mounted from docker-compose
RUN mkdir -p /app/data

EXPOSE 8080

CMD ["java", "-jar", "salon-explorer.jar"]
