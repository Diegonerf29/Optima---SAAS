# imagen de produccion de la API, en dos etapas:
#   1) build: compila con Maven (necesita el JDK)
#   2) runtime: solo el JRE y el .jar (mas pequeña y sin codigo fuente ni Maven)
# construir: docker build -t optima-api .

FROM eclipse-temurin:25-jdk-noble AS build
WORKDIR /build
# primero solo lo necesario para descargar dependencias: Docker reutiliza esta capa
# mientras no cambie el pom.xml, asi las siguientes compilaciones son rapidas
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests

FROM eclipse-temurin:25-jre-noble
# la app no se ejecuta como root
RUN groupadd --system optima && useradd --system --gid optima --no-create-home optima
WORKDIR /app
COPY --from=build /build/target/api-*.jar app.jar
USER optima

ENV TZ=Europe/Madrid \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
# comprobacion de salud sin instalar curl: bash abre una conexion a la api con /dev/tcp,
# pide /actuator/health y mira que la respuesta diga "UP"
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080 && printf 'GET /actuator/health HTTP/1.0\\r\\n\\r\\n' >&3 && grep -q '\"UP\"' <&3"]
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
