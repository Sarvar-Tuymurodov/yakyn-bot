#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Yakyn Bot - Stop All Containers${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

STOPPED=0

# Останавливаем local
if docker ps -a --format '{{.Names}}' | grep -q "^yakyn-bot-local$"; then
    echo -e "${YELLOW}Stopping yakyn-bot-local...${NC}"
    cd .deploy/local && docker-compose down
    cd ../..
    STOPPED=$((STOPPED+1))
fi

# Останавливаем dev
if docker ps -a --format '{{.Names}}' | grep -q "^yakyn-bot-dev$"; then
    echo -e "${YELLOW}Stopping yakyn-bot-dev...${NC}"
    cd .deploy/dev && docker-compose down
    cd ../..
    STOPPED=$((STOPPED+1))
fi

# Останавливаем prod
if docker ps -a --format '{{.Names}}' | grep -q "^yakyn-bot-prod$"; then
    echo -e "${YELLOW}Stopping yakyn-bot-prod...${NC}"
    cd .deploy/prod && docker-compose down
    cd ../..
    STOPPED=$((STOPPED+1))
fi

# Останавливаем stage
if docker ps -a --format '{{.Names}}' | grep -q "^yakyn-bot-stage$"; then
    echo -e "${YELLOW}Stopping yakyn-bot-stage...${NC}"
    cd .deploy/stage && docker-compose down
    cd ../..
    STOPPED=$((STOPPED+1))
fi

echo ""
if [ $STOPPED -eq 0 ]; then
    echo -e "${YELLOW}No yakyn-bot containers running${NC}"
else
    echo -e "${GREEN}✓ Stopped $STOPPED container(s)${NC}"
fi
