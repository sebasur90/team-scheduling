-- Colaborador table
CREATE TABLE colaborador (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    sector VARCHAR(50) NOT NULL CHECK (sector IN ('comercial', 'operativo')),
    estado_atencion VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado_atencion IN ('activo', 'desafectado')),
    habilitado_orientador BOOLEAN DEFAULT FALSE,
    habilitado_gestion_externa BOOLEAN DEFAULT FALSE,
    rol VARCHAR(50) NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
    puntaje_prioridad INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_colaborador_email ON colaborador(email);
CREATE INDEX idx_colaborador_sector ON colaborador(sector);

-- Franja horaria table (5 static rows)
CREATE TABLE franja_horaria (
    id SERIAL PRIMARY KEY,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    orden INTEGER NOT NULL UNIQUE
);

INSERT INTO franja_horaria (hora_inicio, hora_fin, orden) VALUES
    ('12:00', '12:45', 1),
    ('12:30', '13:15', 2),
    ('13:00', '13:45', 3),
    ('13:30', '14:15', 4),
    ('14:00', '14:45', 5);

-- Turno almuerzo table
CREATE TABLE turno_almuerzo (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    franja_horaria_id INTEGER NOT NULL,
    capacidad_maxima INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (franja_horaria_id) REFERENCES franja_horaria(id),
    UNIQUE(fecha, franja_horaria_id)
);

CREATE INDEX idx_turno_almuerzo_fecha ON turno_almuerzo(fecha);
CREATE INDEX idx_turno_almuerzo_fecha_franja ON turno_almuerzo(fecha, franja_horaria_id);

-- Asignacion almuerzo table
CREATE TABLE asignacion_almuerzo (
    id SERIAL PRIMARY KEY,
    turno_almuerzo_id INTEGER NOT NULL,
    colaborador_id INTEGER NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'firme' CHECK (estado IN ('firme', 'pendiente_swap')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (turno_almuerzo_id) REFERENCES turno_almuerzo(id) ON DELETE CASCADE,
    FOREIGN KEY (colaborador_id) REFERENCES colaborador(id),
    UNIQUE(turno_almuerzo_id, colaborador_id)
);

CREATE INDEX idx_asignacion_colaborador ON asignacion_almuerzo(colaborador_id);
CREATE INDEX idx_asignacion_turno ON asignacion_almuerzo(turno_almuerzo_id);

-- Preferencia diaria table
CREATE TABLE preferencia_diaria (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    franja_horaria_id_deseada INTEGER NOT NULL,
    estado_concesion VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado_concesion IN ('pendiente', 'otorgado', 'denegado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colaborador_id) REFERENCES colaborador(id) ON DELETE CASCADE,
    FOREIGN KEY (franja_horaria_id_deseada) REFERENCES franja_horaria(id),
    UNIQUE(colaborador_id, fecha)
);

CREATE INDEX idx_preferencia_diaria_colaborador_fecha ON preferencia_diaria(colaborador_id, fecha);
CREATE INDEX idx_preferencia_diaria_fecha ON preferencia_diaria(fecha);

-- Tarea especial tipo table (catalog)
CREATE TABLE tarea_especial_tipo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    dia_semana_aplicable INTEGER[] NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tarea_especial_tipo (nombre, dia_semana_aplicable, hora_inicio, hora_fin) VALUES
    ('orientador', ARRAY[0,1,2,3,4], '10:00', '15:00'),
    ('municipalidad', ARRAY[2], '11:00', '13:00'),
    ('gandulfo', ARRAY[3], '10:00', '13:00');

-- Tarea especial asignacion table (daily instance)
CREATE TABLE tarea_especial_asignacion (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tarea_especial_tipo_id INTEGER NOT NULL,
    colaborador_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_especial_tipo_id) REFERENCES tarea_especial_tipo(id),
    FOREIGN KEY (colaborador_id) REFERENCES colaborador(id),
    UNIQUE(fecha, tarea_especial_tipo_id)
);

CREATE INDEX idx_tarea_especial_asignacion_fecha ON tarea_especial_asignacion(fecha);
CREATE INDEX idx_tarea_especial_asignacion_colaborador ON tarea_especial_asignacion(colaborador_id);

-- Ausencia table
CREATE TABLE ausencia (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    motivo VARCHAR(50) NOT NULL DEFAULT 'otro' CHECK (motivo IN ('licencia', 'enfermedad', 'otro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colaborador_id) REFERENCES colaborador(id) ON DELETE CASCADE,
    UNIQUE(colaborador_id, fecha)
);

CREATE INDEX idx_ausencia_colaborador_fecha ON ausencia(colaborador_id, fecha);
CREATE INDEX idx_ausencia_fecha ON ausencia(fecha);

-- Swap solicitud table
CREATE TABLE swap_solicitud (
    id SERIAL PRIMARY KEY,
    asignacion_origen_id INTEGER NOT NULL,
    colaborador_solicitante_id INTEGER NOT NULL,
    colaborador_receptor_id INTEGER NOT NULL,
    asignacion_receptor_id INTEGER,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado', 'rechazado', 'cancelado')),
    motivo_rechazo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asignacion_origen_id) REFERENCES asignacion_almuerzo(id) ON DELETE CASCADE,
    FOREIGN KEY (asignacion_receptor_id) REFERENCES asignacion_almuerzo(id) ON DELETE CASCADE,
    FOREIGN KEY (colaborador_solicitante_id) REFERENCES colaborador(id),
    FOREIGN KEY (colaborador_receptor_id) REFERENCES colaborador(id)
);

CREATE INDEX idx_swap_solicitud_solicitante ON swap_solicitud(colaborador_solicitante_id);
CREATE INDEX idx_swap_solicitud_receptor ON swap_solicitud(colaborador_receptor_id);
CREATE INDEX idx_swap_solicitud_estado ON swap_solicitud(estado);

-- Notificacion table
CREATE TABLE notificacion (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    referencia_id INTEGER,
    referencia_tipo VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colaborador_id) REFERENCES colaborador(id) ON DELETE CASCADE
);

CREATE INDEX idx_notificacion_colaborador ON notificacion(colaborador_id);
CREATE INDEX idx_notificacion_leida ON notificacion(leida);
CREATE INDEX idx_notificacion_created_at ON notificacion(created_at DESC);
