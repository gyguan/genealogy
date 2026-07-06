#!/usr/bin/env bash
set -euo pipefail

export SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:postgresql://localhost:5432/genealogy}"
export SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-genealogy}"
export SPRING_DATASOURCE_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-123456}"
export SPRING_FLYWAY_ENABLED="${SPRING_FLYWAY_ENABLED:-true}"

cleanup() {
  if [ -f /tmp/genealogy-backend.pid ]; then
    kill "$(cat /tmp/genealogy-backend.pid)" >/dev/null 2>&1 || true
  fi
  docker rm -f genealogy-postgres >/dev/null 2>&1 || true
}
trap cleanup EXIT

print_startup_error() {
  echo "Startup error summary:"
  grep -Ei "ERROR|Application run failed|Exception|Caused by|Schema-validation|SchemaManagementException|Migration .* failed|Failed|missing|duplicate|constraint" /tmp/genealogy-backend-startup.log | grep -vi " WARN " | tail -n 80 || true
}

echo "Java version:"
java -version

echo "Maven version:"
mvn -version | head -n 2

echo "Starting PostgreSQL..."
docker pull postgres:16 >/dev/null
docker run -d \
  --name genealogy-postgres \
  -e POSTGRES_DB=genealogy \
  -e POSTGRES_USER=genealogy \
  -e POSTGRES_PASSWORD="${SPRING_DATASOURCE_PASSWORD}" \
  -p 5432:5432 \
  postgres:16 >/dev/null

for i in $(seq 1 30); do
  if docker exec genealogy-postgres pg_isready -U genealogy -d genealogy >/dev/null 2>&1; then
    echo "PostgreSQL is ready."
    break
  fi
  if [ "$i" = "30" ]; then
    echo "PostgreSQL did not become ready. Container logs:"
    docker logs genealogy-postgres | tail -n 80
    exit 1
  fi
  sleep 2
done

REF_NAME="${GITHUB_HEAD_REF:-main}"
echo "Downloading repository archive for ref: ${REF_NAME}"
curl -fsSL "https://github.com/gyguan/genealogy/archive/${REF_NAME}.tar.gz" -o repo.tgz
mkdir repo
tar -xzf repo.tgz -C repo --strip-components=1
cd repo/backend/genealogy-backend

echo "Packaging backend..."
set +e
mvn -q -DskipTests package > /tmp/genealogy-maven-package.log 2>&1
code=$?
set -e
if [ "$code" -ne 0 ]; then
  echo "Maven package failed. Output tail:"
  tail -n 160 /tmp/genealogy-maven-package.log
  exit "$code"
fi

JAR_FILE=$(ls target/genealogy-backend-*.jar | head -n 1)
echo "Starting ${JAR_FILE}"
java -jar "${JAR_FILE}" > /tmp/genealogy-backend-startup.log 2>&1 &
echo $! > /tmp/genealogy-backend.pid

for i in $(seq 1 40); do
  if curl -fsS http://localhost:8080/api/v1/health; then
    echo "Backend startup health check passed."
    exit 0
  fi

  if ! kill -0 "$(cat /tmp/genealogy-backend.pid)" 2>/dev/null; then
    echo "Backend process exited before health check passed."
    print_startup_error
    exit 1
  fi

  echo "Waiting for backend startup... attempt ${i}/40"
  sleep 5
done

echo "Backend health check timeout."
print_startup_error
exit 1
