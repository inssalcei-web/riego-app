// Configuración del formulario de ingreso de proyectos (etapa 3),
// tomada exactamente de la pestaña "Formulario ingreso de proyectos"
// del Excel. Cada campo define su clave, etiqueta, tipo de dato,
// y si corresponde, las opciones de la lista desplegable.

export type CampoFormulario =
  | { key: string; label: string; tipo: "texto"; obligatorio: boolean }
  | { key: string; label: string; tipo: "numero"; obligatorio: boolean }
  | { key: string; label: string; tipo: "select"; opciones: string[]; obligatorio: boolean };

export const CAMPOS_FORMULARIO_INGRESO: CampoFormulario[] = [
  { key: "codigo_proyecto", label: "Código proyecto", tipo: "texto", obligatorio: true },
  { key: "nombre_agricultor", label: "Nombre agricultor", tipo: "texto", obligatorio: true },
  { key: "rut_agricultor", label: "RUT agricultor", tipo: "texto", obligatorio: true },
  {
    key: "tipo_proyecto",
    label: "Tipo de proyecto",
    tipo: "select",
    obligatorio: true,
    opciones: [
      "Revestimiento canales",
      "Tranques acumuladores",
      "Fotovoltaico",
      "Riego tecnificado",
      "Otros",
    ],
  },
  { key: "cantidad_hectareas", label: "Cantidad hectáreas", tipo: "numero", obligatorio: true },
  {
    key: "empresa_formuladora",
    label: "Empresa formuladora",
    tipo: "select",
    obligatorio: true,
    opciones: ["Inssal Ltda", "Tío Riego Ltda", "Irrisal Consulting Ltda"],
  },
  {
    key: "empresa_constructora",
    label: "Empresa constructora",
    tipo: "select",
    obligatorio: true,
    opciones: ["Inssal Ltda", "Riego y canales Ltda"],
  },
  {
    key: "fuente_financiamiento",
    label: "Fuente financiamiento",
    tipo: "select",
    obligatorio: true,
    opciones: ["Indap", "CNR", "Privado"],
  },
  { key: "monto_formulacion", label: "Monto formulación", tipo: "numero", obligatorio: true },
  { key: "monto_construccion", label: "Monto construcción", tipo: "numero", obligatorio: true },
  { key: "monto_aporte_propio", label: "Monto aporte propio", tipo: "numero", obligatorio: true },
  { key: "monto_total_proyecto", label: "Monto total proyecto", tipo: "numero", obligatorio: true },
  { key: "comuna", label: "Comuna", tipo: "texto", obligatorio: true },
  { key: "direccion", label: "Dirección", tipo: "texto", obligatorio: true },
  { key: "coordenadas_n", label: "Coordenadas N", tipo: "numero", obligatorio: true },
  { key: "coordenadas_e", label: "Coordenadas E", tipo: "numero", obligatorio: true },
  {
    key: "area_agencia",
    label: "Área agencia",
    tipo: "select",
    obligatorio: true,
    opciones: [
      "Petorca",
      "La Ligua",
      "Los Andes",
      "San Felipe",
      "La Calera",
      "Quillota",
      "Limache",
      "Casablanca",
      "Combarbala",
      "Coquimbo",
      "Marchigue",
      "Paine",
      "Viña del Mar",
      "Magallanes",
      "Valparaíso",
    ],
  },
];
