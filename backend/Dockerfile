# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app
COPY . .
# FIX: use buildFatJar (Ktor's task) instead of shadowJar
RUN gradle buildFatJar --no-daemon

# ── Stage 2: Run ──────────────────────────────────────────────────────────────
# FIX: use JRE slim (has wget) instead of alpine (no wget/curl)
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

COPY --from=builder /app/build/libs/salon-explorer.jar .

RUN mkdir -p /app/data

EXPOSE 8080

CMD ["java", "-jar", "salon-explorer.jar"]
