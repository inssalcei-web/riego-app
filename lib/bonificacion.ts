// Lógica y tipos de la pestaña "Bonificación Profesionales".
// Réplica de la planilla Bonos_planilla.xlsx (hojas Proyectos, Pagos,
// Resumen y Porcentajes).

export const PROFESIONALES = [
  { clave: "oliver", nombre: "Oliver" },
  { clave: "valentina", nombre: "Valentina" },
  { clave: "elizabeth", nombre: "Elizabeth" },
] as const;

export type ClaveProfesional = (typeof PROFESIONALES)[number]["clave"];
export type NombreProfesional = (typeof PROFESIONALES)[number]["nombre"];

export type BonifPrograma = {
  id: string;
  nombre: string;
  pct_oliver: number;
  pct_valentina: number;
  pct_elizabeth: number;
  orden: number;
};

export type BonifProyecto = {
  id: string;
  proyecto_id: string | null;
  codigo_proyecto: string | null;
  programa: string;
  agricultor: string;
  fecha_adjudicacion: string;
  monto_total: number;
  pct_oliver: number;
  pct_valentina: number;
  pct_elizabeth: number;
};

export type BonifPago = {
  id: string;
  fecha: string;
  trabajador: NombreProfesional;
  monto: number;
  detalle: string | null;
};

export type BonifConfig = {
  deuda_oliver: number;
  deuda_valentina: number;
  deuda_elizabeth: number;
  fecha_deuda: string | null;
  mes_inicio_pagos: string | null;
};

export type ProyectoApp = {
  id: string;
  codigo_proyecto: string;
  nombre_agricultor: string;
  monto_total: number | null;
};

// ---------- Conversión de filas (numeric llega como string) ----------

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function aPrograma(f: any): BonifPrograma {
  return {
    id: f.id,
    nombre: f.nombre,
    pct_oliver: num(f.pct_oliver),
    pct_valentina: num(f.pct_valentina),
    pct_elizabeth: num(f.pct_elizabeth),
    orden: num(f.orden),
  };
}

export function aProyecto(f: any): BonifProyecto {
  return {
    id: f.id,
    proyecto_id: f.proyecto_id ?? null,
    codigo_proyecto: f.codigo_proyecto ?? null,
    programa: f.programa,
    agricultor: f.agricultor,
    fecha_adjudicacion: f.fecha_adjudicacion,
    monto_total: num(f.monto_total),
    pct_oliver: num(f.pct_oliver),
    pct_valentina: num(f.pct_valentina),
    pct_elizabeth: num(f.pct_elizabeth),
  };
}

export function aPago(f: any): BonifPago {
  return {
    id: f.id,
    fecha: f.fecha,
    trabajador: f.trabajador,
    monto: num(f.monto),
    detalle: f.detalle ?? null,
  };
}

export function aConfig(f: any): BonifConfig {
  return {
    deuda_oliver: num(f?.deuda_oliver),
    deuda_valentina: num(f?.deuda_valentina),
    deuda_elizabeth: num(f?.deuda_elizabeth),
    fecha_deuda: f?.fecha_deuda ?? null,
    mes_inicio_pagos: f?.mes_inicio_pagos ?? null,
  };
}

// ---------- Utilidades ----------

export function pctDe(
  fila: { pct_oliver: number; pct_valentina: number; pct_elizabeth: number },
  clave: ClaveProfesional
): number {
  return fila[`pct_${clave}` as const];
}

const formatoCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatoMoneda(n: number): string {
  return formatoCLP.format(Math.round(n));
}

// 0.15 -> "15%", 0.075 -> "7,5%"
export function formatoPct(p: number): string {
  const v = Math.round(p * 10000) / 100;
  return `${String(v).replace(".", ",")}%`;
}

export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function hoyISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

// "2026-10-05" -> "05-10-2026"
export function formatoFecha(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${a}`;
}

// ---------- Resumen (hoja "Resumen") ----------

export type ResumenProfesional = {
  clave: ClaveProfesional;
  nombre: NombreProfesional;
  deuda: number;
  bonos: number;
  pagos: number;
  saldo: number;
};

export function calcularResumen(
  config: BonifConfig,
  proyectos: BonifProyecto[],
  pagos: BonifPago[]
): ResumenProfesional[] {
  return PROFESIONALES.map((p) => {
    const deuda = config[`deuda_${p.clave}` as const];
    const bonos = proyectos.reduce((s, pr) => s + pr.monto_total * pctDe(pr, p.clave), 0);
    const pagado = pagos.filter((x) => x.trabajador === p.nombre).reduce((s, x) => s + x.monto, 0);
    return {
      clave: p.clave,
      nombre: p.nombre,
      deuda,
      bonos,
      pagos: pagado,
      saldo: deuda + bonos - pagado,
    };
  });
}

// ---------- Cuadro de pagos por mes (36 meses) ----------

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export type FilaMes = {
  clave: string; // YYYY-MM
  etiqueta: string; // "Octubre 2026"
  montos: Record<ClaveProfesional, number>;
  total: number;
};

export type PagosPorMes = {
  filas: FilaMes[];
  totales: Record<ClaveProfesional, number>;
  total: number;
  // pagos que caen fuera de los 36 meses mostrados
  fuera: Record<ClaveProfesional, number>;
  totalFuera: number;
};

function vacio(): Record<ClaveProfesional, number> {
  return { oliver: 0, valentina: 0, elizabeth: 0 };
}

export function pagosPorMes(pagos: BonifPago[], mesInicio: string | null): PagosPorMes {
  const base = mesInicio ?? hoyISO();
  let anio = Number(base.slice(0, 4));
  let mes = Number(base.slice(5, 7)) - 1;

  const filas: FilaMes[] = [];
  for (let i = 0; i < 36; i++) {
    filas.push({
      clave: `${anio}-${String(mes + 1).padStart(2, "0")}`,
      etiqueta: `${MESES[mes]} ${anio}`,
      montos: vacio(),
      total: 0,
    });
    mes++;
    if (mes > 11) {
      mes = 0;
      anio++;
    }
  }

  const porClave = new Map(filas.map((f) => [f.clave, f]));
  const fuera = vacio();

  for (const pago of pagos) {
    const prof = PROFESIONALES.find((p) => p.nombre === pago.trabajador);
    if (!prof) continue;
    const fila = porClave.get(pago.fecha.slice(0, 7));
    if (fila) {
      fila.montos[prof.clave] += pago.monto;
      fila.total += pago.monto;
    } else {
      fuera[prof.clave] += pago.monto;
    }
  }

  const totales = vacio();
  for (const f of filas) {
    for (const p of PROFESIONALES) totales[p.clave] += f.montos[p.clave];
  }
  const total = totales.oliver + totales.valentina + totales.elizabeth;
  const totalFuera = fuera.oliver + fuera.valentina + fuera.elizabeth;

  return { filas, totales, total, fuera, totalFuera };
}
