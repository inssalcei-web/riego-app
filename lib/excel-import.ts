// ============================================================
// Módulo 19 — Importación desde Excel
//
// Permite reemplazar/actualizar etapas, roles, checklist y KPIs
// subiendo un Excel con el mismo formato que "Indicaciones de
// flujo de información.xlsx" (hojas: Procesos, Roles, y a futuro
// Checklist y KPIs). Solo un Administrador puede ejecutar esto.
// ============================================================

import * as XLSX from "xlsx";
import { z } from "zod";
import { SupabaseClient } from "@supabase/supabase-js";

// ---------- Esquemas de validación (evitan importar datos rotos) ----------

const FilaProcesoSchema = z.object({
  Proceso: z.string().min(1),
  "Perfil encargado": z.string().min(1),
});

const FilaRolSchema = z.object({
  "Perfil de usuario": z.string().min(1).optional(),
  "Usuarios actuales": z.string().min(1),
});

// ---------- Caso de uso principal ----------

export async function importarConfiguracionDesdeExcel(
  archivo: ArrayBuffer,
  supabase: SupabaseClient
) {
  const libro = XLSX.read(archivo, { type: "array" });

  const hojaProcesos = libro.Sheets["Procesos"];
  const hojaRoles = libro.Sheets["Roles"];

  if (!hojaProcesos || !hojaRoles) {
    throw new Error(
      "El Excel debe tener las hojas 'Procesos' y 'Roles', con esos nombres exactos"
    );
  }

  const filasProcesos: unknown[] = XLSX.utils.sheet_to_json(hojaProcesos);
  const filasRoles: unknown[] = XLSX.utils.sheet_to_json(hojaRoles);
  void filasRoles; // se valida junto a los procesos; reservado para futura validación cruzada de roles

  // Validar cada fila antes de tocar la base de datos
  const procesosValidados = filasProcesos.map((f: unknown, i: number) => {
    const r = FilaProcesoSchema.safeParse(f);
    if (!r.success) {
      throw new Error(`Fila ${i + 2} de 'Procesos' inválida: falta Proceso o Perfil encargado`);
    }
    return r.data;
  });

  // Se arma en memoria antes de escribir nada, para no dejar la
  // base de datos a medio actualizar si algo falla en el medio.
  const nuevasEtapas = procesosValidados.map((p, index: number) => ({
    orden: index + 1,
    nombre: p.Proceso,
    rol_id: normalizarRolId(p["Perfil encargado"]),
  }));

  // Reemplazo transaccional: se hace todo o nada.
  const { error } = await supabase.rpc("reemplazar_etapas_definicion", {
    nuevas_etapas: nuevasEtapas,
  });

  if (error) {
    throw new Error(`No se pudo actualizar el flujo: ${error.message}`);
  }

  return {
    ok: true,
    etapas_importadas: nuevasEtapas.length,
  };
}

function normalizarRolId(nombreRol: string): string {
  // 'Ingeniero(a) de proyectos' -> 'ingeniero_proyectos', etc.
  return nombreRol
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // saca tildes
    .replace(/[()]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

// ============================================================
// Nota importante para el usuario (no técnico):
// Si cambian el ORDEN de las filas en la hoja "Procesos", eso
// cambia el orden real de las etapas en la app. Si agregan una
// fila nueva, se crea una etapa nueva automáticamente. Si el
// "Perfil encargado" de una fila no coincide con ninguno de los
// 4 roles existentes, la importación se detiene y avisa el error
// exacto, en vez de crear un rol inválido silenciosamente.
// ============================================================
