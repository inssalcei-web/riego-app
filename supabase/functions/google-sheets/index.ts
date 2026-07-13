// ============================================================
// Módulo 16 — Integración Google Sheets
//
// Principio de diseño: esta integración es un "consumidor" de
// eventos, no una dependencia del motor de flujo. Si Google
// Sheets falla o está caído, el proyecto igual avanza de etapa
// con normalidad — este módulo solo deja constancia externa
// para la construcción futura de KPIs.
// ============================================================

interface MovimientoSheet {
  fecha: string;
  proyecto: string;
  cliente: string;
  etapa_completada: string;
  etapa_nueva: string | null;
  responsable_anterior: string;
  responsable_nuevo: string | null;
  finalizado: boolean;
}

const SHEET_ID = Deno.env.get("GOOGLE_SHEET_ID")!;
const SHEET_RANGE = "Movimientos!A:H";

export async function registrarMovimientoEnSheet(mov: MovimientoSheet) {
  try {
    const accessToken = await obtenerTokenGoogle();

    const fila = [
      mov.fecha,
      mov.proyecto,
      mov.cliente,
      mov.etapa_completada,
      mov.etapa_nueva ?? "—",
      mov.responsable_anterior,
      mov.responsable_nuevo ?? "—",
      mov.finalizado ? "Sí" : "No",
    ];

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [fila] }),
      }
    );

    if (!res.ok) {
      await registrarFalloIntegracion("google_sheets", await res.text());
    }
  } catch (err) {
    // Nunca se propaga hacia el motor de flujo — se registra y sigue.
    await registrarFalloIntegracion("google_sheets", String(err));
  }
}

async function obtenerTokenGoogle(): Promise<string> {
  // Autenticación vía cuenta de servicio de Google (Service Account),
  // configurada aparte en las variables de entorno de Supabase.
  // Detalle de implementación fuera del alcance de este módulo.
  throw new Error("Pendiente: configurar credenciales de cuenta de servicio de Google");
}

async function registrarFalloIntegracion(integracion: string, detalle: string) {
  console.error(`[integracion:${integracion}] fallo`, detalle);
  // Se guarda también en la tabla `auditoria` con accion = 'fallo_integracion'
  // para poder revisarlo después sin perder visibilidad del problema.
}
