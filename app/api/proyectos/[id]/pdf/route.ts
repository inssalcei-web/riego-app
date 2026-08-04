import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { diasEnEtapa, estaArchivado, DIAS_PARA_ARCHIVAR, montosCompletos } from "@/lib/data/proyectos";
import { MOTIVOS_CIERRE } from "@/lib/types";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const AZUL = "#1D4ED8";
const CELESTE = "#0E7490";
const CELESTE_BG = "#ECFEFF";
const GRIS = "#475569";
const GRIS_CLARO = "#F1F5F9";
const VERDE = "#15803D";
const VERDE_BG = "#F0FDF4";
const NARANJA = "#C2410C";
const NARANJA_BG = "#FFF7ED";
const BORDE = "#DBEAFE";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { data: proyecto } = await supabase.from("proyectos").select("*").eq("id", id).single();
  if (!proyecto) return new NextResponse("Proyecto no encontrado", { status: 404 });

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

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 45, size: "LETTER" });
  doc.on("data", (c: Buffer) => chunks.push(c));
  const fin = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const anchoUtil = doc.page.width - 90;

  // ---------- Encabezado ----------
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const logoBuffer = fs.readFileSync(logoPath);
    doc.image(logoBuffer, 45, 40, { width: 90 });
  } catch {
    // Si el logo no se pudo cargar, se sigue sin él.
  }
  doc.fillColor(AZUL).fontSize(19).font("Helvetica-Bold").text("FICHA DE PROYECTO", 150, 42);
  doc.fillColor(GRIS).fontSize(9).font("Helvetica").text(
    `Generado el ${new Date().toLocaleDateString("es-CL")} por ${user.email}`,
    150,
    64
  );
  doc.moveTo(45, 95).lineTo(45 + anchoUtil, 95).strokeColor(BORDE).lineWidth(1).stroke();
  doc.y = 108;

  function seccion(titulo: string) {
    doc.moveDown(0.6);
    doc.fillColor(AZUL).fontSize(12).font("Helvetica-Bold").text(titulo);
    doc.moveDown(0.3);
  }

  function campo2col(campos: [string, string][]) {
    const colAncho = anchoUtil / 2;
    let filaY = doc.y;
    for (let i = 0; i < campos.length; i += 2) {
      const startY = doc.y;
      doc.fillColor(GRIS).fontSize(7.5).font("Helvetica").text(campos[i][0].toUpperCase(), 45, startY, { width: colAncho - 10 });
      doc.fillColor("#0F172A").fontSize(10.5).font("Helvetica-Bold").text(campos[i][1], 45, doc.y, { width: colAncho - 10 });
      let alturaCol1 = doc.y;

      if (campos[i + 1]) {
        doc.fillColor(GRIS).fontSize(7.5).font("Helvetica").text(campos[i + 1][0].toUpperCase(), 45 + colAncho, startY, { width: colAncho - 10 });
        doc.fillColor("#0F172A").fontSize(10.5).font("Helvetica-Bold").text(campos[i + 1][1], 45 + colAncho, doc.y, { width: colAncho - 10 });
      }
      doc.y = Math.max(alturaCol1, doc.y) + 8;
    }
  }

  function avisoVacio(texto: string, color = NARANJA, bg = NARANJA_BG) {
    const startY = doc.y;
    doc.fillColor(bg).rect(45, startY, anchoUtil, 0).fill();
    doc.fillColor(color).fontSize(9).font("Helvetica-Oblique");
    const alturaTexto = doc.heightOfString(texto, { width: anchoUtil - 20 });
    doc.fillColor(bg).rect(45, startY, anchoUtil, alturaTexto + 16).fill();
    doc.fillColor(color).text(texto, 55, startY + 8, { width: anchoUtil - 20 });
    doc.y = startY + alturaTexto + 24;
  }

  // ---------- Datos generales ----------
  seccion("Datos generales");
  const camposBase: [string, string][] = [
    ["Código de proyecto", proyecto.codigo_proyecto ?? "—"],
    ["Nombre agricultor", proyecto.nombre_agricultor ?? "—"],
  ];

  if (datos.tipo_proyecto) {
    const tipos = Array.isArray(datos.tipo_proyecto) ? datos.tipo_proyecto.join(", ") : datos.tipo_proyecto;
    camposBase.push(["RUT agricultor", datos.rut_agricultor ?? "—"]);
    camposBase.push(["Fuente de financiamiento", datos.fuente_financiamiento ?? "—"]);
    camposBase.push(["Comuna", datos.comuna ?? "—"]);
    camposBase.push(["Área / agencia", datos.area_agencia ?? "—"]);
    camposBase.push(["Dirección", datos.direccion ?? "—"]);
    camposBase.push(["Cantidad hectáreas", datos.cantidad_hectareas ? `${datos.cantidad_hectareas} há` : "—"]);
    camposBase.push(["Tipo de proyecto", tipos]);
    camposBase.push(["Empresa formuladora", datos.empresa_formuladora ?? "—"]);
    camposBase.push(["Empresa constructora", datos.empresa_constructora ?? "—"]);
  }

  campo2col(camposBase);

  if (!datos.tipo_proyecto) {
    avisoVacio(
      "El resto de los datos generales (RUT, tipo de proyecto, financiamiento, ubicación, hectáreas, empresas) todavía no existen — se completan en la etapa 3 (Ingreso formulario de proyectos)."
    );
  }

  // ---------- Estado actual ----------
  seccion("Estado actual");

  if (proyecto.finalizado) {
    const cerradoAnticipado = !!proyecto.motivo_cierre;
    const texto = cerradoAnticipado
      ? `Cerrado anticipadamente — ${MOTIVOS_CIERRE[proyecto.motivo_cierre] ?? proyecto.motivo_cierre}`
      : "Proyecto completado";
    avisoVacio(texto, cerradoAnticipado ? NARANJA : VERDE, cerradoAnticipado ? NARANJA_BG : VERDE_BG);
  } else {
    const startY = doc.y;
    doc.fillColor(CELESTE_BG).rect(45, startY, anchoUtil, 40).fill();
    doc.fillColor(CELESTE).fontSize(10).font("Helvetica-Bold").text(
      `FASE ${fase?.orden ?? "—"} · ${(fase?.nombre ?? "—").toUpperCase()}`,
      55,
      startY + 13
    );
    doc.fillColor("#0F172A").text(`Etapa ${etapaActual?.orden ?? "—"} · ${etapaActual?.nombre ?? "—"}`, 240, startY + 13);
    const colorDias = dias <= 14 ? VERDE : dias <= 21 ? NARANJA : "#B91C1C";
    doc.fillColor(colorDias).text(`● ${dias} día${dias === 1 ? "" : "s"} en esta etapa`, 420, startY + 13);
    doc.y = startY + 52;

    doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica").text(
      `Progreso general del flujo: ${Math.round(((etapaActual?.orden ?? 0) / 27) * 100)}% (etapa ${etapaActual?.orden ?? "—"} de 27)`
    );
    doc.moveDown(0.3);

    if (archivado) {
      avisoVacio(
        proyecto.archivado_manual
          ? `Este proyecto está ARCHIVADO manualmente. Motivo: ${proyecto.archivado_motivo ?? "—"}`
          : `Este proyecto está ARCHIVADO automáticamente por llevar ${dias} días sin moverse de etapa (61 días o más).`,
        "#B91C1C",
        "#FEF2F2"
      );
    } else {
      doc.fillColor(GRIS).fontSize(9).font("Helvetica").text(
        `Este proyecto NO está archivado. Faltan ${diasParaArchivo} día${diasParaArchivo === 1 ? "" : "s"} para que se archive automáticamente si no se mueve de etapa.`
      );
      doc.moveDown(0.5);
    }
  }

  // ---------- Montos ----------
  seccion("Montos de postulación");
  if (montosCompletos(datos)) {
    const startY = doc.y;
    const filaAlto = 22;
    doc.fillColor(AZUL).rect(45, startY, anchoUtil, filaAlto).fill();
    doc.fillColor("#FFFFFF").fontSize(9.5).font("Helvetica-Bold").text("Concepto", 55, startY + 6);
    doc.text("Monto (CLP)", 45, startY + 6, { width: anchoUtil - 10, align: "right" });
    let y = startY + filaAlto;
    CAMPOS_MONTOS.forEach((c, i) => {
      const esUltimo = i === CAMPOS_MONTOS.length - 1;
      doc.fillColor(esUltimo ? GRIS_CLARO : "#FFFFFF").rect(45, y, anchoUtil, filaAlto).fill();
      doc.fillColor("#0F172A").fontSize(9.5).font(esUltimo ? "Helvetica-Bold" : "Helvetica").text(c.label, 55, y + 6);
      doc.text(formatoMoneda(datos[c.key]), 45, y + 6, { width: anchoUtil - 10, align: "right" });
      y += filaAlto;
    });
    doc.strokeColor(BORDE).lineWidth(0.5).rect(45, startY, anchoUtil, filaAlto * (CAMPOS_MONTOS.length + 1)).stroke();
    doc.y = y + 10;
  } else {
    avisoVacio(
      "Todavía no se han cargado montos — se completan en la etapa 15 (Postulación), a cargo del Administrador."
    );
  }

  // ---------- Timeline ----------
  seccion("Historial de movimientos");
  if (timeline && timeline.length > 0) {
    doc.fillColor(CELESTE).rect(45, doc.y, anchoUtil, 20).fill();
    doc.fillColor("#FFFFFF").fontSize(8.5).font("Helvetica-Bold");
    const yHeader = doc.y - 20;
    doc.text("Fecha", 50, yHeader + 5, { width: 70 });
    doc.text("Movimiento", 122, yHeader + 5, { width: 300 });
    doc.text("Responsable", 425, yHeader + 5, { width: 110 });

    timeline.forEach((ev: any, i: number) => {
      const fecha = new Date(ev.ocurrido_en).toLocaleDateString("es-CL");
      const nombreUsuario = ev.usuario_id ? usuariosPorId.get(ev.usuario_id) ?? "—" : "—";
      const alturaDesc = doc.heightOfString(ev.descripcion, { width: 300 });
      const alturaFila = Math.max(alturaDesc, 12) + 10;

      if (doc.y + alturaFila > doc.page.height - 60) {
        doc.addPage();
        doc.y = 45;
      }

      const y = doc.y;
      if (i % 2 === 1) doc.fillColor(GRIS_CLARO).rect(45, y, anchoUtil, alturaFila).fill();
      doc.fillColor("#0F172A").fontSize(8.5).font("Helvetica").text(fecha, 50, y + 5, { width: 70 });
      doc.fillColor(GRIS).text(ev.descripcion, 122, y + 5, { width: 300 });
      doc.fillColor("#0F172A").text(nombreUsuario, 425, y + 5, { width: 110 });
      doc.y = y + alturaFila;
    });
    doc.moveDown(0.5);
  } else {
    avisoVacio("Este proyecto todavía no tiene movimientos registrados.");
  }

  // ---------- Documentos legales ----------
  seccion("Documentos legales solicitados");
  if (documentos && documentos.length > 0) {
    documentos.forEach((d: any) => {
      const nombre = d.documentos_legales_catalogo?.nombre ?? "Documento";
      const marca = d.completado ? "✓" : "○";
      const color = d.completado ? VERDE : GRIS;
      const bg = d.completado ? VERDE_BG : GRIS_CLARO;
      doc.fillColor(bg).rect(45, doc.y, anchoUtil, 18).fill();
      doc.fillColor(color).fontSize(9).font("Helvetica").text(`${marca}  ${nombre}`, 55, doc.y + 4.5);
      doc.y += 18;
    });
    doc.moveDown(0.3);
  } else {
    avisoVacio("Todavía no se ha solicitado ningún documento legal — se define en la etapa 5.");
  }

  // ---------- Pie ----------
  doc.moveDown(1);
  doc.moveTo(45, doc.y).lineTo(45 + anchoUtil, doc.y).strokeColor(BORDE).lineWidth(0.5).stroke();
  doc.moveDown(0.3);
  doc.fillColor(GRIS).fontSize(8).font("Helvetica").text(
    "Documento generado automáticamente por Riego App — INSSAL Ingeniería y Construcción.",
    45
  );

  doc.end();
  const buffer = await fin;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ficha_Proyecto_${proyecto.codigo_proyecto ?? proyecto.id}.pdf"`,
    },
  });
}
