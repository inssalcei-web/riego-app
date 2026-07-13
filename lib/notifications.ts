// ============================================================
// Módulo 11 — Notificaciones
//
// Dos canales:
// 1. Tiempo real (Supabase Realtime) — si el usuario está conectado,
//    la notificación aparece al instante, sin recargar la página.
// 2. Persistidas en tabla `notificaciones` — si no está conectado,
//    las ve apenas inicia sesión (se consultan al cargar la app).
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface Notificacion {
  id: string;
  usuario_id: string;
  proyecto_id: string | null;
  mensaje: string;
  leida: boolean;
  creado_en: string;
}

// ---------- Lado servidor: ya se insertan en complete-stage.ts ----------
// La tabla `notificaciones` es la única fuente de verdad.
// Este módulo se encarga de ENTREGARLAS, no de crearlas.

// ---------- Lado cliente (hook para usar en React/React Native) ----------

export function useNotificaciones(supabase: SupabaseClient, usuarioId: string) {
  // Pseudocódigo de la estrategia (implementación final con React Query + Zustand):
  //
  // 1. Al montar: traer notificaciones no leídas desde la tabla.
  //    supabase.from('notificaciones').select('*')
  //      .eq('usuario_id', usuarioId).eq('leida', false)
  //
  // 2. Suscribirse a nuevas notificaciones en tiempo real:
  //    supabase.channel(`notificaciones:${usuarioId}`)
  //      .on('postgres_changes', {
  //          event: 'INSERT', schema: 'public', table: 'notificaciones',
  //          filter: `usuario_id=eq.${usuarioId}`
  //        }, (payload) => mostrarToast(payload.new))
  //      .subscribe()
  //
  // 3. Al marcar como leída:
  //    supabase.from('notificaciones').update({ leida: true }).eq('id', id)
  //
  // Este mismo hook sirve para web y para Expo (Supabase Realtime
  // funciona igual en ambos), por eso vive en un paquete compartido
  // (`packages/application/notifications`) y no dentro de `apps/web`.
}

// ---------- Envío de correo (opcional, definido en el flujo) ----------

export async function enviarCorreoNotificacion(params: {
  destinatarioEmail: string;
  proyectoNombre: string;
  etapaNombre: string;
}) {
  // Se dispara desde triggerExternalEffects() en complete-stage.ts,
  // igual que Google Sheets: de forma desacoplada, sin bloquear
  // el avance del proyecto si el envío falla.
  //
  // Proveedor sugerido: Resend (integración simple con Supabase Edge
  // Functions, sin infraestructura SMTP propia). Se confirma cuando
  // se defina el proveedor de correo de la empresa.
}
