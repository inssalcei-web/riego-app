// ============================================================
// Generación del PDF "Ficha de proyecto".
//
// Este módulo se extrajo de app/api/proyectos/[id]/pdf/route.ts
// para poder reutilizar exactamente el mismo informe desde dos
// lugares:
//   1) la ruta interna (con sesión), para el equipo de INSSAL.
//   2) la ruta pública por RUT (sin sesión), para agricultores.
// La única diferencia entre ambos usos es quién generó el PDF y
// qué cliente de Supabase se usa para leer los datos.
// ============================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from "pdf-lib";
import { diasEnEtapa, estaArchivado, DIAS_PARA_ARCHIVAR, montosCompletos } from "@/lib/data/proyectos";
import { MOTIVOS_CIERRE } from "@/lib/types";

const AZUL = rgb(0.114, 0.306, 0.847);
const CELESTE = rgb(0.055, 0.451, 0.565);
const CELESTE_BG = rgb(0.925, 0.996, 1);
const GRIS = rgb(0.278, 0.333, 0.412);
const GRIS_CLARO = rgb(0.945, 0.961, 0.976);
const VERDE = rgb(0.082, 0.502, 0.239);
const VERDE_BG = rgb(0.941, 0.992, 0.957);
const NARANJA = rgb(0.761, 0.255, 0.047);
const NARANJA_BG = rgb(1, 0.969, 0.929);
const ROJO = rgb(0.725, 0.11, 0.11);
const ROJO_BG = rgb(0.996, 0.949, 0.949);
const BORDE = rgb(0.859, 0.918, 0.996);
const NEGRO = rgb(0.059, 0.09, 0.165);
const BLANCO = rgb(1, 1, 1);

const CAMPOS_MONTOS = [
  { key: "monto_formulacion", label: "Monto formulación" },
  { key: "monto_construccion", label: "Monto construcción" },
  { key: "monto_aporte_propio", label: "Monto aporte propio" },
  { key: "monto_total_proyecto", label: "Monto total proyecto" },
];

function formatoMoneda(valor: unknown) {
  const n = parseFloat(String(valor).replace(/[^\d.-]/g, ""));
  if (isNaN(n)) return "—";
  return "$ " + n.toLocaleString("es-CL");
}

function limpiarTexto(texto: string) {
  return texto.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

class Lienzo {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
  margen = 45;
  ancho = 612;
  alto = 792;
  y = 792 - 45;

  constructor(doc: PDFDocument, font: PDFFont, fontBold: PDFFont, fontItalic: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.fontBold = fontBold;
    this.fontItalic = fontItalic;
    this.page = doc.addPage([this.ancho, this.alto]);
  }

  get anchoUtil() {
    return this.ancho - this.margen * 2;
  }

  asegurarEspacio(alturaNecesaria: number) {
    if (this.y - alturaNecesaria < 55) {
      this.page = this.doc.addPage([this.ancho, this.alto]);
      this.y = this.alto - this.margen;
    }
  }

  texto(texto: string, x: number, size: number, font: PDFFont, color: RGB) {
    this.page.drawText(limpiarTexto(texto), { x, y: this.y, size, font, color });
  }

  parrafoConAjuste(texto: string, x: number, anchoMax: number, size: number, font: PDFFont, color: RGB, interlineado = 13) {
    const palabras = limpiarTexto(texto).split(" ");
    let linea = "";
    const lineas: string[] = [];
    for (const palabra of palabras) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (font.widthOfTextAtSize(prueba, size) > anchoMax && linea) {
        lineas.push(linea);
        linea = palabra;
      } else {
        linea = prueba;
      }
    }
    if (linea) lineas.push(linea);

    this.asegurarEspacio(lineas.length * interlineado);
    lineas.forEach((l) => {
      this.page.drawText(l, { x, y: this.y, size, font, color });
      this.y -= interlineado;
    });
    return lineas.length * interlineado;
  }

  linea() {
    this.page.drawLine({
      start: { x: this.margen, y: this.y },
      end: { x: this.margen + this.anchoUtil, y: this.y },
      thickness: 1,
      color: BORDE,
    });
  }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    this.page.drawRectangle({ x, y, width: w, height: h, color });
  }

  seccion(titulo: string) {
    this.asegurarEspacio(30);
    this.y -= 10;
    this.texto(titulo, this.margen, 12, this.fontBold, AZUL);
    this.y -= 16;
  }

  avisoVacio(texto: string, color: RGB = NARANJA, bg: RGB = NARANJA_BG) {
    const size = 9;
    const anchoMax = this.anchoUtil - 20;
    const palabras = limpiarTexto(texto).split(" ");
    let linea = "";
    const lineas: string[] = [];
    for (const palabra of palabras) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (this.fontItalic.widthOfTextAtSize(prueba, size) > anchoMax && linea) {
        lineas.push(linea);
        linea = palabra;
      } else {
        linea = prueba;
      }
    }
    if (linea) lineas.push(linea);

    const alturaCaja = lineas.length * 13 + 16;
    this.asegurarEspacio(alturaCaja + 10);
    this.rect(this.margen, this.y - alturaCaja + 13, this.anchoUtil, alturaCaja, bg);
    let yTexto = this.y;
    lineas.forEach((l) => {
      this.page.drawText(l, { x: this.margen + 10, y: yTexto, size, font: this.fontItalic, color });
      yTexto -= 13;
    });
    this.y -= alturaCaja + 10;
  }

  campos2col(campos: [string, string][]) {
    const colAncho = this.anchoUtil / 2;
    for (let i = 0; i < campos.length; i += 2) {
      this.asegurarEspacio(36);
      const startY = this.y;
      this.texto(campos[i][0].toUpperCase(), this.margen, 7.5, this.font, GRIS);
      this.y -= 12;
      this.texto(campos[i][1] || "—", this.margen, 10.5, this.fontBold, NEGRO);
      const finCol1 = this.y;

      if (campos[i + 1]) {
        let y2 = startY;
        this.page.drawText(limpiarTexto(campos[i + 1][0].toUpperCase()), { x: this.margen + colAncho, y: y2, size: 7.5, font: this.font, color: GRIS });
        y2 -= 12;
        this.page.drawText(limpiarTexto(campos[i + 1][1] || "—"), { x: this.margen + colAncho, y: y2, size: 10.5, font: this.fontBold, color: NEGRO });
      }
      this.y = finCol1 - 12;
    }
  }
}

export async function generarInformeProyectoPdf({
  supabase,
  proyecto,
  generadoPor,
  logoUrl,
}: {
  supabase: SupabaseClient;
  proyecto: any;
  generadoPor: string;
  logoUrl: string | null;
}): Promise<Uint8Array> {
  const id = proyecto.id;

  const [{ data: etapaActual }, { data: usuarios }, { data: timeline }, { data: documentos }] = await Promise.all([
    supabase.from("etapas_definicion").select("*").eq("id", proyecto.etapa_actual_id).single(),
    supabase.from("usuarios").select("id, nombre"),
    supabase.from("timeline_eventos").select("*").eq("proyecto_id", id).order("ocurrido_en", { ascending: true }),
    supabase
      .from("proyecto_documentos_legales")
      .select("completado, documentos_legales_catalogo(nombre)")
      .eq("proyecto_id", id),
  ]);

  const { data: fase } = etapaActual
    ? await supabase.from("fases").select("*").eq("id", etapaActual.fase_id).single()
    : { data: null };

  const usuariosPorId = new Map((usuarios ?? []).map((u: any) => [u.id, u.nombre]));
  const dias = diasEnEtapa(proyecto.etapa_actual_desde);
  const archivado = estaArchivado(proyecto);
  const diasParaArchivo = Math.max(0, DIAS_PARA_ARCHIVAR - dias);
  const datos = proyecto.datos_formulario ?? {};

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const c = new Lienzo(pdfDoc, font, fontBold, fontItalic);

  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const bytes = await res.arrayBuffer();
        const logoImg = await pdfDoc.embedPng(bytes);
        const escala = 70 / logoImg.width;
        c.page.drawImage(logoImg, {
          x: c.margen,
          y: c.y - logoImg.height * escala + 10,
          width: 70,
          height: logoImg.height * escala,
        });
      }
    } catch {
      // Si el logo no carga, el PDF se genera igual, sin él.
    }
  }

  c.texto("FICHA DE PROYECTO", c.margen + 105, 19, fontBold, AZUL);
  c.y -= 16;
  c.texto(`Generado el ${new Date().toLocaleDateString("es-CL")} · ${generadoPor}`, c.margen + 105, 9, font, GRIS);
  c.y -= 30;
  c.linea();
  c.y -= 15;

  c.seccion("Datos generales");
  const camposBase: [string, string][] = [
    ["Código de proyecto", proyecto.codigo_proyecto ?? "—"],
    ["Nombre agricultor", proyecto.nombre_agricultor ?? "—"],
  ];

  if (datos.tipo_proyecto) {
    const tipos = Array.isArray(datos.tipo_proyecto) ? datos.tipo_proyecto.join(", ") : datos.tipo_proyecto;
    camposBase.push(
      ["RUT agricultor", datos.rut_agricultor ?? "—"],
      ["Fuente de financiamiento", datos.fuente_financiamiento ?? "—"],
      ["Comuna", datos.comuna ?? "—"],
      ["Área / agencia", datos.area_agencia ?? "—"],
      ["Dirección", datos.direccion ?? "—"],
      ["Cantidad hectáreas", datos.cantidad_hectareas ? `${datos.cantidad_hectareas} há` : "—"],
      ["Tipo de proyecto", tipos],
      ["Empresa formuladora", datos.empresa_formuladora ?? "—"],
      ["Empresa constructora", datos.empresa_constructora ?? "—"]
    );
  }
  c.campos2col(camposBase);

  if (!datos.tipo_proyecto) {
    c.avisoVacio(
      "El resto de los datos generales (RUT, tipo de proyecto, financiamiento, ubicación, hectáreas, empresas) todavía no existen — se completan en la etapa 3 (Ingreso formulario de proyectos)."
    );
  }

  c.seccion("Estado actual");

  if (proyecto.finalizado) {
    const cerradoAnticipado = !!proyecto.motivo_cierre;
    const texto = cerradoAnticipado
      ? `Cerrado anticipadamente — ${MOTIVOS_CIERRE[proyecto.motivo_cierre] ?? proyecto.motivo_cierre}`
      : "Proyecto completado";
    c.avisoVacio(texto, cerradoAnticipado ? NARANJA : VERDE, cerradoAnticipado ? NARANJA_BG : VERDE_BG);
  } else {
    c.asegurarEspacio(50);
    c.rect(c.margen, c.y - 32, c.anchoUtil, 40, CELESTE_BG);
    const yCaja = c.y - 14;
    c.page.drawText(limpiarTexto(`FASE ${fase?.orden ?? "—"} · ${(fase?.nombre ?? "—").toUpperCase()}`), { x: c.margen + 10, y: yCaja, size: 9.5, font: fontBold, color: CELESTE });
    c.page.drawText(limpiarTexto(`Etapa ${etapaActual?.orden ?? "—"} · ${etapaActual?.nombre ?? "—"}`), { x: c.margen + 195, y: yCaja, size: 9.5, font: fontBold, color: NEGRO });
    const colorDias = dias <= 14 ? VERDE : dias <= 21 ? NARANJA : ROJO;
    c.page.drawText(limpiarTexto(`${dias} dia${dias === 1 ? "" : "s"} en esta etapa`), { x: c.margen + 375, y: yCaja, size: 9.5, font: fontBold, color: colorDias });
    c.y -= 50;

    c.texto(
      `Progreso general del flujo: ${Math.round(((etapaActual?.orden ?? 0) / 27) * 100)}% (etapa ${etapaActual?.orden ?? "—"} de 27)`,
      c.margen,
      9.5,
      font,
      NEGRO
    );
    c.y -= 20;

    if (archivado) {
      c.avisoVacio(
        proyecto.archivado_manual
          ? `Este proyecto esta ARCHIVADO manualmente. Motivo: ${proyecto.archivado_motivo ?? "—"}`
          : `Este proyecto esta ARCHIVADO automaticamente por llevar ${dias} dias sin moverse de etapa (${DIAS_PARA_ARCHIVAR} dias o mas).`,
        ROJO,
        ROJO_BG
      );
    } else {
      c.parrafoConAjuste(
        `Este proyecto NO esta archivado. Faltan ${diasParaArchivo} dia${diasParaArchivo === 1 ? "" : "s"} para que se archive automaticamente si no se mueve de etapa.`,
        c.margen,
        c.anchoUtil,
        9,
        font,
        GRIS
      );
      c.y -= 8;
    }
  }

  c.seccion("Montos de postulación");
  if (montosCompletos(datos)) {
    const filaAlto = 22;
    c.asegurarEspacio(filaAlto * (CAMPOS_MONTOS.length + 1) + 10);
    const startY = c.y;
    c.rect(c.margen, startY - filaAlto + 6, c.anchoUtil, filaAlto, AZUL);
    c.page.drawText("Concepto", { x: c.margen + 10, y: startY - 8, size: 9.5, font: fontBold, color: BLANCO });
    c.page.drawText("Monto (CLP)", { x: c.margen + c.anchoUtil - 110, y: startY - 8, size: 9.5, font: fontBold, color: BLANCO });
    let y = startY - filaAlto;
    CAMPOS_MONTOS.forEach((cm, i) => {
      const esUltimo = i === CAMPOS_MONTOS.length - 1;
      c.rect(c.margen, y - filaAlto + 6, c.anchoUtil, filaAlto, esUltimo ? GRIS_CLARO : BLANCO);
      c.page.drawText(limpiarTexto(cm.label), { x: c.margen + 10, y: y - 8, size: 9.5, font: esUltimo ? fontBold : font, color: NEGRO });
      const montoTxt = formatoMoneda(datos[cm.key]);
      c.page.drawText(montoTxt, { x: c.margen + c.anchoUtil - 10 - fontBold.widthOfTextAtSize(montoTxt, 9.5), y: y - 8, size: 9.5, font: fontBold, color: NEGRO });
      y -= filaAlto;
    });
    c.y = y - 8;
  } else {
    c.avisoVacio("Todavia no se han cargado montos — se completan en la etapa 15 (Postulacion), a cargo del Administrador.");
  }

  c.seccion("Historial de movimientos");
  if (timeline && timeline.length > 0) {
    c.asegurarEspacio(24);
    c.rect(c.margen, c.y - 12, c.anchoUtil, 20, CELESTE);
    c.page.drawText("Fecha", { x: c.margen + 8, y: c.y - 6, size: 8.5, font: fontBold, color: BLANCO });
    c.page.drawText("Movimiento", { x: c.margen + 75, y: c.y - 6, size: 8.5, font: fontBold, color: BLANCO });
    c.page.drawText("Responsable", { x: c.margen + 380, y: c.y - 6, size: 8.5, font: fontBold, color: BLANCO });
    c.y -= 20;

    timeline.forEach((ev: any, i: number) => {
      const fecha = new Date(ev.ocurrido_en).toLocaleDateString("es-CL");
      const nombreUsuario = ev.usuario_id ? usuariosPorId.get(ev.usuario_id) ?? "—" : "—";

      const palabras = limpiarTexto(ev.descripcion).split(" ");
      let linea = "";
      const lineas: string[] = [];
      for (const palabra of palabras) {
        const prueba = linea ? `${linea} ${palabra}` : palabra;
        if (font.widthOfTextAtSize(prueba, 8.5) > 295 && linea) {
          lineas.push(linea);
          linea = palabra;
        } else {
          linea = prueba;
        }
      }
      if (linea) lineas.push(linea);

      const alturaFila = Math.max(lineas.length * 11, 14) + 6;
      c.asegurarEspacio(alturaFila);

      if (i % 2 === 1) c.rect(c.margen, c.y - alturaFila + 6, c.anchoUtil, alturaFila, GRIS_CLARO);
      c.page.drawText(fecha, { x: c.margen + 8, y: c.y - 6, size: 8.5, font, color: NEGRO });
      let yDesc = c.y - 6;
      lineas.forEach((l) => {
        c.page.drawText(l, { x: c.margen + 75, y: yDesc, size: 8.5, font, color: GRIS });
        yDesc -= 11;
      });
      c.page.drawText(limpiarTexto(nombreUsuario), { x: c.margen + 380, y: c.y - 6, size: 8.5, font, color: NEGRO });
      c.y -= alturaFila;
    });
    c.y -= 8;
  } else {
    c.avisoVacio("Este proyecto todavia no tiene movimientos registrados.");
  }

  c.seccion("Documentos legales solicitados");
  if (documentos && documentos.length > 0) {
    documentos.forEach((d: any) => {
      const nombre = d.documentos_legales_catalogo?.nombre ?? "Documento";
      c.asegurarEspacio(18);
      const bg = d.completado ? VERDE_BG : GRIS_CLARO;
      const color = d.completado ? VERDE : GRIS;
      c.rect(c.margen, c.y - 12, c.anchoUtil, 18, bg);
      c.page.drawText(limpiarTexto(`${d.completado ? "check" : "o"}  ${nombre}`), { x: c.margen + 10, y: c.y - 6.5, size: 9, font, color });
      c.y -= 18;
    });
    c.y -= 8;
  } else {
    c.avisoVacio("Todavia no se ha solicitado ningun documento legal — se define en la etapa 5.");
  }

  c.asegurarEspacio(30);
  c.linea();
  c.y -= 14;
  c.texto("Documento generado automaticamente por Riego App — INSSAL Ingenieria y Construccion.", c.margen, 8, font, GRIS);

  return pdfDoc.save();
}
