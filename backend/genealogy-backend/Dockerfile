FROM eclipse-temurin:17-jre

WORKDIR /app

COPY target/genealogy-backend-*.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
