import { SupabaseClient } from "@supabase/supabase-js";

export async function cerrarProyectoAnticipado(
  supabase: SupabaseClient,
  proyectoId: string,
  usuarioId: string,
  motivo: string
): Promise<{ ok: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cerrar-proyecto`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ proyecto_id: proyectoId, usuario_id: usuarioId, motivo }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: `Respuesta inesperada del servidor (código ${res.status})` };
  }

  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error ?? `Error del servidor (código ${res.status})` };
  }

  return { ok: true };
}
