# ---- Build stage: compile and run tests with Maven ----
FROM maven:3.9-eclipse-temurin-11 AS build
WORKDIR /app
# Cache dependencies first for faster rebuilds.
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q clean package

# ---- Run stage: small JRE image with just the jar ----
FROM eclipse-temurin:11-jre
WORKDIR /app
COPY --from=build /app/target/wallet-service-1.0.0.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
