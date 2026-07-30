# 🚀 Cargar Datos con UV

Este proyecto utiliza `uv` como gestor de paquetes. Aquí están las instrucciones para cargar los datos de prueba.

## ⚡ Método 1: Usando uv run (Recomendado)

### Paso 1: Asegurar que Postgres está corriendo
```bash
docker-compose up -d postgres

# Esperar a que esté listo (5-10 segundos)
docker-compose logs postgres
```

### Paso 2: Ejecutar el cargador de datos con uv

**Opción A: Script directo**
```bash
chmod +x datos_prueba/load_with_uv.sh
./datos_prueba/load_with_uv.sh
```

**Opción B: Comando uv directo**
```bash
uv run --no-project \
  --with sqlalchemy==2.0.23 \
  --with psycopg2-binary==2.9.9 \
  --with python-dotenv==1.0.0 \
  python datos_prueba/load_test_data.py
```

## ⚡ Método 2: Con pyproject.toml

### Paso 1: Instalar dependencias
```bash
cd datos_prueba
uv sync
cd ..
```

### Paso 2: Ejecutar el script
```bash
uv run -p datos_prueba python datos_prueba/load_test_data.py
```

O simplemente:
```bash
cd datos_prueba
uv run python load_test_data.py
cd ..
```

## ⚡ Método 3: Instalar globalmente en el proyecto

Si prefieres tener las dependencias disponibles globalmente:

```bash
uv pip install -r backend/requirements.txt
python datos_prueba/load_test_data.py
```

## 🔍 Ver datos antes de cargar

Con cualquier método, puedes primero visualizar los datos:

```bash
uv run --no-project python datos_prueba/view_test_data.py
```

O con pip:
```bash
python datos_prueba/view_test_data.py
```

## 📦 Dependencias necesarias

El script `load_test_data.py` requiere:
- `sqlalchemy==2.0.23`
- `psycopg2-binary==2.9.9`
- `python-dotenv==1.0.0`

Estas están definidas en `pyproject.toml` y en `backend/requirements.txt`.

## ✅ Verificar que funcionó

Después de ejecutar el cargador:

1. Los datos deberían estar en la base de datos
2. Deberías ver un resumen final con ✅ indicando éxito
3. Puedes verificar ejecutando:
   ```bash
   python datos_prueba/view_test_data.py
   ```

## 🐛 Troubleshooting

### "uv: command not found"
```bash
pip install uv
```

### "Error de conexión a PostgreSQL"
```bash
# Verificar que postgres esté corriendo
docker-compose ps

# Ver logs
docker-compose logs postgres

# Reiniciar si es necesario
docker-compose restart postgres
```

### "ModuleNotFoundError"
Usa el método 1 (uv run --no-project) que instala las dependencias automáticamente.

## 📝 Notas

- `uv run --no-project` ejecuta el script en un entorno aislado sin afectar tu proyecto principal
- Las dependencias se instalan temporalmente solo para esa ejecución
- Es seguro y no interfiere con otros proyectos
