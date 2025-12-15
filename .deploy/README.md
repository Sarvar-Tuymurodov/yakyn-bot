# Yakyn Bot - Docker Deployment

Унифицированная структура развертывания для проекта Yakyn Bot.

## Структура

```
.deploy/
├── _shared/           # Общие файлы для всех окружений
│   ├── Dockerfile     # Базовый Dockerfile для development
│   └── scripts/       # Скрипты развертывания
│       ├── entrypoint.sh      # Entrypoint для dev контейнера
│       ├── deploy-local.sh    # Запуск local окружения
│       ├── deploy-dev.sh      # Запуск dev окружения
│       ├── deploy-prod.sh     # Запуск prod окружения
│       ├── deploy-stage.sh    # Запуск stage окружения
│       └── stop-all.sh        # Остановка всех контейнеров
├── local/             # Локальная разработка с hot reload
├── dev/               # Dev окружение (GitHub Registry)
├── stage/             # Stage окружение (GitHub Registry)
└── prod/              # Production окружение (GitHub Registry)
```

## Окружения

### Local (Port: 10300)
**Для локальной разработки с hot reload**

```bash
./.deploy/_shared/scripts/deploy-local.sh
```

Или вручную:
```bash
cd .deploy/local
docker-compose up --build -d
```

- Container: `yakyn-bot-local`
- Build: Собирается локально из Dockerfile
- Volumes: Монтируется код для hot reload
- Database: Использует локальный PostgreSQL
- URL: http://localhost:10300

### Dev (Port: 10301)
**Development окружение из GitHub Registry**

```bash
./.deploy/_shared/scripts/deploy-dev.sh
```

- Container: `yakyn-bot-dev`
- Image: `ghcr.io/YOUR_ORG/yakyn-bot:dev-latest`
- Auto-update: Watchtower enabled
- URL: http://localhost:10301

### Stage (Port: 10303)
**Staging окружение из GitHub Registry**

```bash
./.deploy/_shared/scripts/deploy-stage.sh
```

- Container: `yakyn-bot-stage`
- Image: `ghcr.io/YOUR_ORG/yakyn-bot:stage-latest`
- Auto-update: Watchtower enabled
- URL: http://localhost:10303

### Production (Port: 10302)
**Production окружение из GitHub Registry**

```bash
./.deploy/_shared/scripts/deploy-prod.sh
```

- Container: `yakyn-bot-prod`
- Image: `ghcr.io/YOUR_ORG/yakyn-bot:prod-latest`
- Auto-update: Watchtower enabled
- URL: http://localhost:10302

## Остановка контейнеров

```bash
./.deploy/_shared/scripts/stop-all.sh
```

## Database

### Локальная разработка
В local окружении используется локальный PostgreSQL через Docker network `yakyn_network`.

```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/yakyn?schema=public
```

### Production/Dev/Stage
Используется Neon PostgreSQL или другой внешний провайдер.

## Требования

1. **Docker Network**: Автоматически создается скриптами
   ```bash
   docker network create yakyn_network
   ```

2. **.env файл**: Для local окружения нужен .env в корне проекта
   ```bash
   cp .env.example .env
   # Отредактируйте .env с вашими credentials
   ```

3. **PostgreSQL**: Для local окружения нужен локальный PostgreSQL
   - Должен быть подключен к `yakyn_network`
   - Или используйте docker-compose из .deploy/local который включает postgres

## Полезные команды

```bash
# Просмотр логов
docker logs -f yakyn-bot-local
docker logs -f yakyn-bot-dev
docker logs -f yakyn-bot-prod

# Войти в контейнер
docker exec -it yakyn-bot-local sh

# Prisma Studio (в dev контейнере)
docker exec -it yakyn-bot-local npx prisma studio

# Применить миграции
docker exec -it yakyn-bot-local npx prisma migrate deploy

# Проверка статуса
docker ps | grep yakyn-bot
```

## Порты

| Окружение | Container Name    | Port  |
|-----------|-------------------|-------|
| Local     | yakyn-bot-local   | 10300 |
| Dev       | yakyn-bot-dev     | 10301 |
| Prod      | yakyn-bot-prod    | 10302 |
| Stage     | yakyn-bot-stage   | 10303 |

## Технический стек

- **Base Image**: node:20-alpine
- **Package Manager**: npm
- **Framework**: Express.js + Grammy (Telegram Bot)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Runtime Port**: 3000 (внутри контейнера)
