// Campos de montos, que se llenan en la etapa "Postulación", a
// cargo del Administrador. Usan las mismas claves de siempre dentro
// de datos_formulario, así que los KPIs no necesitan ningún cambio.

export const CAMPOS_MONTOS_POSTULACION = [
  { key: "monto_formulacion", label: "Monto formulación" },
  { key: "monto_construccion", label: "Monto construcción" },
  { key: "monto_aporte_propio", label: "Monto aporte propio" },
  { key: "monto_total_proyecto", label: "Monto total proyecto" },
] as const;
