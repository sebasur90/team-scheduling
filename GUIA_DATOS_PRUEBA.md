# 🚀 Guía Rápida: Carga de Datos de Prueba

Archivos de datos de prueba generados automáticamente para desarrollo y testing del sistema de planificación de almuerzos.

## 📦 Qué se incluye

✅ **3 Sectores:**
- Operativo (10 cap., 2 min., verde, participa en almuerzos)
- Comercial (10 cap., 3 min., naranja, participa en almuerzos)
- Gerencial (10 cap., 1 min., azul, NO participa en almuerzos)

✅ **5 Franjas horarias:**
- 12:00-12:45 (cap. 3)
- 12:30-13:15 (cap. 3)
- 13:00-13:45 (cap. 3)
- 13:30-14:15 (cap. 3)
- 14:00-14:45 (cap. 3)

✅ **21 Colaboradores:**
- 7 por sector, con preferencias de franjas aleatorias

✅ **2 Tareas especiales:**
- Gandulfo: Lunes y Miércoles (09:00-13:00)
- Municipalidad: Martes (10:00-14:00)

## ⚡ Inicio rápido (CON UV)

### 1️⃣ Ver los datos que se cargarán
```bash
python datos_prueba/view_test_data.py
```

### 2️⃣ Asegurar que Postgres está corriendo
```bash
docker-compose up -d postgres

# Esperar 5-10 segundos para que esté listo
sleep 5
```

### 3️⃣ Cargar los datos en la BD (opción recomendada con UV)
```bash
uv run --no-project \
  --with sqlalchemy==2.0.23 \
  --with psycopg2-binary==2.9.9 \
  --with python-dotenv==1.0.0 \
  python datos_prueba/load_test_data.py
```

**O usar el script:**
```bash
chmod +x datos_prueba/load_with_uv.sh
./datos_prueba/load_with_uv.sh
```

### 4️⃣ Generar datos nuevos (opcional)
Si quieres regenerar con diferentes valores aleatorios:
```bash
python datos_prueba/generate_test_data.py

# Luego cargar nuevamente
uv run --no-project \
  --with sqlalchemy==2.0.23 \
  --with psycopg2-binary==2.9.9 \
  --with python-dotenv==1.0.0 \
  python datos_prueba/load_test_data.py
```

## 📁 Archivos del directorio `datos_prueba/`

| Archivo | Descripción |
|---------|-------------|
| `datos_ejemplo.json` | JSON con todos los datos (generado automáticamente) |
| `generate_test_data.py` | Script que genera `datos_ejemplo.json` |
| `load_test_data.py` | Script que carga datos en la BD |
| `view_test_data.py` | Script que muestra los datos en consola |
| `README.md` | Documentación completa |
| `load_data.sh` | Script shell para cargar datos (alt) |

## 🐛 Si algo falla

### PostgreSQL no está disponible
```bash
docker-compose up -d postgres
docker-compose logs postgres  # Ver logs
```

### "ModuleNotFoundError: sqlalchemy"
```bash
pip install -r backend/requirements.txt
```

### "Connection refused"
Postgres necesita más tiempo para iniciar:
```bash
docker-compose up postgres  # Sin -d
# Espera a ver "listening on all addresses"
# Luego Ctrl+C y ejecuta:
docker-compose up -d
```

## 📊 Ejemplo de salida

Cuando ejecutas `python datos_prueba/load_test_data.py`:

```
============================================================
🚀 Cargador de Datos de Prueba
============================================================

📊 Base de datos: postgresql://...

📋 Creando tablas si no existen...
✅ Tablas verificadas/creadas

🗑️  Limpiando base de datos...
✅ Base de datos limpiada

📦 Cargando sectores...
  ✓ Operativo (ID: 1)
  ✓ Comercial (ID: 2)
  ✓ Gerencial (ID: 3)

[... más datos ...]

✅ DATOS CARGADOS EXITOSAMENTE
============================================================
```

## 💡 Próximos pasos

1. **Inicia el backend:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Inicia el frontend:**
   ```bash
   cd frontend
   npm install  # (primera vez)
   npm run dev
   ```

3. **Accede a la aplicación:**
   - http://localhost:5173

4. **API Docs:**
   - http://localhost:8000/docs

## 🔄 Flujo completo de desarrollo

```bash
# Terminal 1: Servicios
docker-compose up postgres firebase-emulator

# Terminal 2: Cargar datos (espera a que postgres esté listo)
python datos_prueba/load_test_data.py

# Terminal 3: Backend
cd backend && python -m uvicorn app.main:app --reload

# Terminal 4: Frontend
cd frontend && npm run dev

# Accede a http://localhost:5173
```

## 📝 Personalizar datos

Ver `datos_prueba/README.md` para detalles sobre cómo modificar:
- Nombres de colaboradores
- Capacidades y mínimos de cobertura
- Franjas horarias
- Tareas especiales
- Colores de sectores

## ❓ Más información

Ver la documentación completa en `datos_prueba/README.md`
