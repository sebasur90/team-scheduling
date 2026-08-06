#!/bin/bash

# Docker Compose environment selector
# Usage: ./compose.sh [corporate|local] [docker-compose command]

ENVIRONMENT=${1:-local}

case $ENVIRONMENT in
  corporate)
    if [ ! -f .env.corporate ]; then
      echo "Error: .env.corporate no existe"
      echo "Crear archivo .env.corporate con variables de proxy corporativas"
      exit 1
    fi
    source .env.corporate
    docker-compose -f docker-compose.yml -f docker-compose.corporate.yml "${@:2}"
    ;;
  local)
    docker-compose -f docker-compose.yml -f docker-compose.local.yml "${@:2}"
    ;;
  *)
    echo "Usage: ./compose.sh [corporate|local] [docker-compose command]"
    echo ""
    echo "Ejemplos:"
    echo "  ./compose.sh corporate up -d"
    echo "  ./compose.sh corporate logs -f"
    echo "  ./compose.sh corporate down"
    echo ""
    echo "  ./compose.sh local up -d"
    echo "  ./compose.sh local logs -f"
    echo "  ./compose.sh local down"
    echo ""
    echo "Ver DOCKER_ENVIRONMENTS.md para más detalles"
    exit 1
    ;;
esac
