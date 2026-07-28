from enum import Enum


class Sector(str, Enum):
    COMERCIAL = "comercial"
    OPERATIVO = "operativo"


class EstadoAtencion(str, Enum):
    ACTIVO = "activo"
    DESAFECTADO = "desafectado"


class Rol(str, Enum):
    ADMIN = "admin"
    USUARIO = "usuario"


class EstadoConcesion(str, Enum):
    PENDIENTE = "pendiente"
    OTORGADO = "otorgado"
    DENEGADO = "denegado"


class EstadoSwap(str, Enum):
    PENDIENTE = "pendiente"
    ACEPTADO = "aceptado"
    RECHAZADO = "rechazado"
    CANCELADO = "cancelado"


class EstadoAsignacion(str, Enum):
    FIRME = "firme"
    PENDIENTE_SWAP = "pendiente_swap"
    NOTIFICADA = "notificada"
    CONFIRMADA = "confirmada"


class MotivosAusencia(str, Enum):
    LICENCIA = "licencia"
    ENFERMEDAD = "enfermedad"
    OTRO = "otro"


class TipoConcesion(str, Enum):
    ORIENTADOR = "orientador"
    MUNICIPALIDAD = "municipalidad"
    GANDULFO = "gandulfo"


class CanalNotificacion(str, Enum):
    IN_APP = "in_app"
    PUSH = "push"


class EstadoIncidencia(str, Enum):
    VENTANA_ADMIN = "ventana_admin"
    BROADCAST_ACTIVO = "broadcast_activo"
    RESUELTA = "resuelta"
    SIN_CANDIDATOS = "sin_candidatos"


class MotivoIncidencia(str, Enum):
    RECHAZO = "rechazo"
    TIMEOUT = "timeout"
