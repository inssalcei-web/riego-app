export interface Rol {
  id: string;
  nombre: string;
}

export interface Usuario {
  id: string;
  auth_user_id: string;
  nombre: string;
  rol_id: string;
  activo: boolean;
  especialidad: string | null;
}

export interface Fase {
  id: string;
  orden: number;
  nombre: string;
}

export type TipoAccionEtapa = "checkbox" | "formulario" | "documentos_legales";

export interface EtapaDefinicion {
  id: number;
  orden: number;
  nombre: string;
  fase_id: string;
  rol_id: string;
  tipo_accion: TipoAccionEtapa;
  mensaje_pendiente: string | null;
  mensaje_notificacion: string | null;
  usuario_asignado_id: string | null;
  multi_responsable: boolean;
  requiere_montos: boolean;
}

export interface ChecklistItemDefinicion {
  id: number;
  etapa_id: number;
  descripcion: string;
  obligatorio: boolean;
  orden: number;
  usuario_asignado_id: string | null;
}

export interface Cliente {
  id: string;
  nombre: string;
}

export interface Proyecto {
  id: string;
  nombre: string | null;
  codigo_proyecto: string;
  nombre_agricultor: string;
  cliente_id: string | null;
  etapa_actual_id: number;
  etapa_actual_desde: string;
  responsable_actual_id: string;
  fecha_inicio: string;
  fecha_objetivo: string | null;
  finalizado: boolean;
  motivo_cierre: string | null;
  fecha_retomar: string | null;
  aviso_retomar_enviado: boolean;
  archivado_manual: boolean;
  archivado_motivo: string | null;
  archivado_en: string | null;
  creado_en: string;
  datos_formulario: Record<string, any>;
}

export const MOTIVOS_CIERRE: Record<string, string> = {
  rechazo_presupuesto: "Rechazo de presupuesto",
  falta_documentos_legales: "Falta de documentos legales",
  falta_presupuesto: "Falta de presupuesto",
  cliente_desiste: "Cliente desiste",
};

export type ColorSemaforo = "verde" | "amarillo" | "rojo";

export interface ProyectoConDetalle extends Proyecto {
  cliente_nombre: string;
  etapa_nombre: string;
  etapa_orden: number;
  fase_id: string;
  fase_nombre: string;
  fase_orden: number;
  responsable_nombre: string;
  fuente_financiamiento: string | null;
  porcentaje_avance: number;
  dias_en_etapa: number;
  color_semaforo: ColorSemaforo;
  archivado: boolean;
}

export interface ChecklistInstancia {
  id: string;
  proyecto_id: string;
  item_definicion_id: number;
  completado: boolean;
  completado_en: string | null;
  completado_por: string | null;
}

export interface ChecklistItemConEstado extends ChecklistItemDefinicion {
  instancia_id: string;
  completado: boolean;
  usuario_asignado_nombre?: string | null;
}

export interface TimelineEvento {
  id: string;
  proyecto_id: string;
  tipo: "creacion" | "cambio_etapa" | "cambio_responsable" | "observacion";
  descripcion: string;
  usuario_id: string | null;
  ocurrido_en: string;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  proyecto_id: string | null;
  mensaje: string;
  leida: boolean;
  creado_en: string;
}

export interface DocumentoLegalCatalogo {
  id: number;
  nombre: string;
}

export interface ProyectoDocumentoLegal {
  id: string;
  proyecto_id: string;
  documento_id: number;
  completado: boolean;
}
