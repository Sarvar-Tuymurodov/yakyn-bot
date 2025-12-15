#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Yakyn Bot - Local Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo -e "Creating from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env created. Please update it with your credentials.${NC}"
    echo ""
fi

# Проверяем Docker network
if ! docker network inspect yakyn_network >/dev/null 2>&1; then
    echo -e "${YELLOW}Creating yakyn_network...${NC}"
    docker network create yakyn_network
    echo -e "${GREEN}✓ Network created${NC}"
    echo ""
fi

# Переходим в директорию local
cd .deploy/local

echo -e "${BLUE}Starting local development container...${NC}"
docker-compose up --build -d

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ Local container started!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Container: ${BLUE}yakyn-bot-local${NC}"
    echo -e "Port: ${BLUE}http://localhost:10300${NC}"
    echo -e "Database: ${BLUE}PostgreSQL on yakyn_network${NC}"
    echo ""
    echo -e "Commands:"
    echo -e "  ${YELLOW}docker logs -f yakyn-bot-local${NC} - View logs"
    echo -e "  ${YELLOW}docker exec -it yakyn-bot-local sh${NC} - Enter container"
    echo -e "  ${YELLOW}docker exec -it yakyn-bot-local npx prisma studio${NC} - Prisma Studio"
    echo -e "  ${YELLOW}cd .deploy/local && docker-compose down${NC} - Stop container"
else
    echo ""
    echo -e "${RED}✗ Failed to start container${NC}"
    exit 1
fi
