# Docker Compose - Ambientes de Ejecución

Este documento explica cómo ejecutar los servicios en diferentes ambientes.

## Estructura de Archivos

- **`docker-compose.yml`** — Configuración base (común para todos los ambientes)
- **`docker-compose.corporate.yml`** — Overrides para red corporativa (smoa7001lx)
- **`docker-compose.local.yml`** — Overrides para desarrollo local
- **`.env.corporate`** — Variables de proxy corporativas (ignorado en git, NO COMMITTEAR)

## Ambientes Soportados

### 1. Red Corporativa (smoa7001lx)

**Ubicación:** Máquina corporativa con proxy

**Archivos necesarios:**
- `docker-compose.yml`
- `docker-compose.corporate.yml`
- `.env.corporate` ← Debe estar configurado con los datos del proxy

**Ejecución:**

```bash
# Cargar variables de proxy y ejecutar
source .env.corporate
docker-compose -f docker-compose.yml -f docker-compose.corporate.yml up -d

# O en un comando:
docker-compose -f docker-compose.yml -f docker-compose.corporate.yml up -d
```

**Configurar proxy en `.env.corporate`:**

```
HTTP_PROXY=http://usuario:contraseña@proxy-server:puerto
HTTPS_PROXY=http://usuario:contraseña@proxy-server:puerto
NO_PROXY=.corporate,127.0.0.1,localhost,firebase-emulator,backend
```

**Servicios disponibles:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Firebase Emulator: http://localhost:3002

---

### 2. Desarrollo Local (Otra Máquina)

**Ubicación:** Máquina sin proxy corporativo

**Archivos necesarios:**
- `docker-compose.yml`
- `docker-compose.local.yml`

**Ejecución:**

```bash
# Opción 1: Usar solo el compose base (recomendado)
docker-compose up -d

# Opción 2: Explícito con override local
docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

**Servicios disponibles:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Firebase Emulator: http://localhost:3002

---

## Comandos Comunes

### Ver logs
```bash
# Corporate
docker-compose -f docker-compose.yml -f docker-compose.corporate.yml logs -f

# Local
docker-compose logs -f
```

### Detener servicios
```bash
# Corporate
docker-compose -f docker-compose.yml -f docker-compose.corporate.yml down

# Local
docker-compose down
```

### Reconstruir imágenes
```bash
# Corporate
docker-compose -f docker-compose.yml -f docker-compose.corporate.yml build

# Local
docker-compose build
```

### Ejecutar comando en contenedor
```bash
# Corporate - backend
docker-compose -f docker-compose.yml -f docker-compose.corporate.yml exec backend bash

# Local - backend
docker-compose exec backend bash
```

---

## Script de Conveniencia (Opcional)

Crear `compose.sh` para automatizar:

```bash
#!/bin/bash

ENVIRONMENT=${1:-local}

case $ENVIRONMENT in
  corporate)
    source .env.corporate
    docker-compose -f docker-compose.yml -f docker-compose.corporate.yml "${@:2}"
    ;;
  local)
    docker-compose -f docker-compose.yml -f docker-compose.local.yml "${@:2}"
    ;;
  *)
    echo "Uso: ./compose.sh [corporate|local] [comando docker-compose]"
    echo "Ejemplos:"
    echo "  ./compose.sh corporate up -d"
    echo "  ./compose.sh local logs -f"
    exit 1
    ;;
esac
```

Uso:
```bash
chmod +x compose.sh
./compose.sh corporate up -d
./compose.sh local logs -f
```

---

## Troubleshooting

### En red corporativa: Error de conexión a proxy
- Verificar valores en `.env.corporate`
- Confirmar que el proxy está accesible: `curl -x http://proxy:puerto http://google.com`
- Revisar NO_PROXY para excluir servicios locales

### Puertos ya en uso
```bash
# Ver qué proceso usa el puerto
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :3002  # Firebase
```

### Contenedores no se comunican
- Verificar NO_PROXY en variables de entorno
- Confirmar que `docker-compose` está usando el archivo correcto
- Revisar logs: `docker-compose logs firebase-emulator`
