# Plan: Autenticación por Email (Opción 1)

## Resumen
Implementar login simple por email para colaboradores regulares. Solo sebassur90@gmail.com usa contraseña para crear/administrar equipos.

---

## 1. Backend - Cambios de Base de Datos

### Archivo: `backend/app/models/colaborador.py`
Agregar dos campos:
```python
password_hash = Column(String(255), nullable=True)
es_admin = Column(Boolean, default=False)
```

### Crear migración: `backend/migrations/002_add_auth_fields.sql`
```sql
ALTER TABLE colaborador ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE colaborador ADD COLUMN es_admin BOOLEAN DEFAULT FALSE;
```

---

## 2. Backend - Autenticación

### Modificar: `backend/app/api/auth.py`

**Cambios:**
- Cambiar `LoginRequest` de `colaborador_id` a `email`
- Endpoint `POST /auth/login` - Login simple por email (sin contraseña)
- Endpoint `POST /auth/setup` - Setup inicial con contraseña (solo sebassur90@gmail.com)

**Ejemplos:**
```python
# Login simple (colaboradores regulares)
POST /auth/login
Body: { "email": "user@example.com" }
Response: { "token": "...", "user": {...} }

# Setup con contraseña (solo admin)
POST /auth/setup
Body: { "email": "sebassur90@gmail.com", "password": "MiPassword123" }
Response: { "token": "...", "user": {...} }
```

### Crear/Modificar: `backend/app/auth/local.py`

Agregar funciones de hashing:
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hash: str) -> bool:
    return pwd_context.verify(plain, hash)
```

---

## 3. Backend - Inicialización

### Crear script: `backend/scripts/init_admin.py`

Script que:
- Crea colaborador `sebassur90@gmail.com`
- Establece `es_admin=True`
- Hashea y guarda contraseña

### Ejecutar en startup

Opción A: Agregar en `backend/Dockerfile` antes de uvicorn
```dockerfile
RUN python scripts/init_admin.py
```

Opción B: Ejecutar manualmente después de `docker-compose up`
```bash
docker-compose exec backend python scripts/init_admin.py
```

---

## 4. Frontend - UI de Login

### Crear/Modificar: `frontend/src/pages/LoginPage.tsx`

**Flujo:**
1. Usuario ingresa email
2. Si email existe en BD → login simple (sin contraseña)
3. Si email es `sebassur90@gmail.com` → mostrar campo de contraseña
4. Guardar token en localStorage

### Modificar: `frontend/src/App.tsx` o router
- Redirigir a `/login` si no hay token válido
- Mostrar dashboard solo si está autenticado

---

## 5. Nuevos Endpoints

### `POST /auth/login`
```json
Body: { "email": "juan@example.com" }
Response: { "token": "xyz...", "user": { "id": 1, "nombre": "Juan", ... } }
```

### `POST /auth/setup`
```json
Body: { "email": "sebassur90@gmail.com", "password": "password123" }
Response: { "token": "xyz...", "user": { "id": 1, "nombre": "Admin", "es_admin": true } }
```

### `POST /equipos/crear` (nuevo)
```json
Headers: { "Authorization": "Bearer token" }
Body: { "nombre": "Equipo A" }
Response: { "equipo_id": 1, "nombre": "Equipo A" }
```
⚠️ Solo funciona si `user.es_admin == True`

---

## 6. Orden de Implementación

1. ✅ Agregar campos a modelo `Colaborador`
2. ✅ Crear migración SQL
3. ✅ Crear funciones de hash en `auth/local.py`
4. ✅ Modificar endpoint `/auth/login` (email simple)
5. ✅ Crear endpoint `/auth/setup` (sebassur90@gmail.com + password)
6. ✅ Crear script `init_admin.py`
7. ✅ Actualizar frontend (pantalla de login)
8. ✅ Crear endpoint `POST /equipos/crear`

---

## 7. Archivos a Cambiar

| Archivo | Cambio |
|---------|--------|
| `backend/app/models/colaborador.py` | Agregar 2 campos |
| `backend/app/api/auth.py` | Modificar login, agregar setup |
| `backend/app/auth/local.py` | Agregar hash/verify password |
| `backend/migrations/002_add_auth_fields.sql` | Nueva migración |
| `backend/scripts/init_admin.py` | Crear script |
| `frontend/src/pages/LoginPage.tsx` | Crear/modificar UI |
| `frontend/src/App.tsx` | Agregar guard de autenticación |

**Total: ~7 archivos, cambios mínimos**

---

## 8. Consideraciones

- ✅ Compatibilidad hacia atrás: colaboradores existentes pueden seguir usando email sin contraseña
- ✅ Sin cambios grandes en modelos
- ✅ DB: solo 2 columnas nuevas
- ✅ Escalable: agregar más admins es trivial

---

## 9. Instalar dependencia

En `backend/requirements.txt`, agregar:
```
passlib==1.7.4
python-multipart==0.0.6
```
(probablemente ya esté instalado, verificar)

