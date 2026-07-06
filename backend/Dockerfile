FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy pom.xml
COPY pom.xml .

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl
WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar app.jar"]
