import { SupabaseClient } from "@supabase/supabase-js";

// Llama a la función complete-stage directamente por fetch, en vez
// de supabase.functions.invoke(), porque ese método no siempre deja
// ver el mensaje de error real cuando la función responde con un
// código de error (400, 403, etc.) — solo mostraba un mensaje
// genérico. Con fetch directo, siempre se lee el motivo exacto.
export async function completarEtapa(
  supabase: SupabaseClient,
  proyectoId: string,
  usuarioId: string
): Promise<{ ok: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/complete-stage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ proyecto_id: proyectoId, usuario_id: usuarioId }),
    }
  );

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
