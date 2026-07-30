# Datos de Prueba - Sistema de Planificación de Almuerzos

Este directorio contiene datos de ejemplo para pruebas y desarrollo del sistema de planificación de almuerzos.

## 📋 Contenido

### Archivos generados automáticamente:
- **`datos_ejemplo.json`** - Archivo JSON con todos los datos de prueba

### Scripts:
- **`generate_test_data.py`** - Genera el archivo `datos_ejemplo.json` con datos de ejemplo
- **`load_test_data.py`** - Carga los datos del JSON en la base de datos

## 🚀 Cómo usar

### Cargar datos en la base de datos

Desde el directorio raíz del proyecto:

```bash
python datos_prueba/load_test_data.py
```

Este script:
- ✅ Verifica la conexión a la base de datos
- ✅ Crea las tablas si no existen
- 🗑️ Limpia los datos previos
- 📦 Carga sectores
- ⏰ Carga franjas horarias
- 👥 Carga colaboradores
- 🎯 Carga tareas especiales

**Requisitos previos:**
- Base de datos PostgreSQL corriendo: `docker-compose up -d postgres`
- Dependencias instaladas: `pip install -r backend/requirements.txt`

### Generar nuevos datos de ejemplo (opcional)

Si deseas regenerar los datos con diferentes valores aleatorios:

```bash
python datos_prueba/generate_test_data.py
```

Esto creará/actualizará el archivo `datos_ejemplo.json` con nuevos datos aleatorios.

## 📊 Datos incluidos

### 3 Sectores:
1. **Operativo** (verde #22c55e)
   - Capacidad máxima: 10
   - Mínimo de cobertura: 2
   - Participa en almuerzos: ✅

2. **Comercial** (naranja #f97316)
   - Capacidad máxima: 10
   - Mínimo de cobertura: 3
   - Participa en almuerzos: ✅

3. **Gerencial** (azul #3b82f6)
   - Capacidad máxima: 10
   - Mínimo de cobertura: 1
   - Participa en almuerzos: ❌

### 4 Franjas horarias:
- **Franja 1**: 12:00 - 12:45
- **Franja 2**: 12:45 - 13:30
- **Franja 3**: 13:30 - 14:15
- **Franja 4**: 14:15 - 15:00

### 21 Colaboradores (7 por sector)
- Cada colaborador tiene:
  - Nombre único
  - Email único
  - Sector asignado
  - Franja horaria preferida (aleatoria 1-4)
  - Estado activo
  - Rol usuario

**Sector Operativo:**
- Juan García
- María López
- Carlos Rodríguez
- Ana Martínez
- Pedro Fernández
- Laura Sánchez
- Roberto Díaz

**Sector Comercial:**
- Andrea Gutiérrez
- Diego Morales
- Sofia Reyes
- Alejandro Peña
- Catalina Torres
- Miguel Castro
- Valentina Ruiz

**Sector Gerencial:**
- Fernando Molina
- Isabel Navarro
- Gonzalo Flores
- Roxana Acosta
- Eduardo Rojas
- Marcela Vargas
- Cristian Bravo

### 2 Tareas especiales:

1. **Gandulfo**
   - Días: Lunes y Miércoles
   - Horario: 09:00 - 13:00

2. **Municipalidad**
   - Días: Martes
   - Horario: 10:00 - 14:00

## 🔄 Flujo de trabajo típico

```bash
# 1. Iniciar servicios
docker-compose up -d

# 2. Esperar a que postgres esté listo (verificar con: docker-compose logs postgres)

# 3. Cargar datos de prueba
python datos_prueba/load_test_data.py

# 4. Si deseas código fresco, regenera los datos
python datos_prueba/generate_test_data.py
python datos_prueba/load_test_data.py
```

## 📝 Personalizar datos

Para generar datos diferentes:

1. Edita `generate_test_data.py`
2. Modifica:
   - Nombres en `NOMBRES_OPERATIVO`, `NOMBRES_COMERCIAL`, `NOMBRES_GERENCIAL`
   - Colores en el diccionario `COLORES`
   - Capacidades y mínimos de cobertura en `generate_sectors()`
   - Franjas horarias en `generate_franjas_horarias()`
   - Tareas especiales en `generate_tareas_especiales()`

3. Ejecuta:
   ```bash
   python datos_prueba/generate_test_data.py
   python datos_prueba/load_test_data.py
   ```

## 🐛 Troubleshooting

### Error de conexión a BD
```bash
# Verifica que PostgreSQL esté corriendo
docker-compose ps

# Si no está corriendo:
docker-compose up -d postgres

# Verifica la salud del servicio
docker-compose logs postgres
```

### Error de importación de módulos
```bash
# Asegúrate de estar en el directorio correcto
cd /path/to/team-scheduling

# Verifica que tengas las dependencias instaladas
pip install -r backend/requirements.txt
```

### Datos no aparecen en la interfaz
- Reinicia el servidor del backend
- Limpia el cache del navegador (Ctrl+Shift+Del)
- Verifica los logs del backend: `docker-compose logs backend`

## 📞 Notas

- El archivo `datos_ejemplo.json` es generado automáticamente y se puede regenerar en cualquier momento
- Al ejecutar `load_test_data.py`, se limpian todos los datos previos en esas tablas (excepto usuarios admin)
- Las franjas horarias y sectores son globales para toda la aplicación
- Cada colaborador tiene una preferencia de franja horaria (1-4) asignada aleatoriamente
- No se eliminan usuarios admin existentes, solo se limpian las tablas de datos maestros
