# Riego App

App de seguimiento y control de proyectos de riego. Next.js 15 + TypeScript + Tailwind + Supabase.

## Qué hay ya construido

- **Autenticación** real con Supabase Auth (`/login`).
- **Proyectos activos** (`/proyectos`): tablero Kanban con las 5 fases y las 30 etapas reales.
- **Mis tareas** (`/mis-tareas`): proyectos asignados al usuario conectado, con checklist funcional y botón "Completar etapa" conectado al motor de flujo.
- **KPIs e informes** (`/kpis`): indicadores calculados en tiempo real desde la base de datos.
- **Motor de flujo** (`supabase/functions/complete-stage`): avanza el proyecto de etapa automáticamente, valida checklist, asigna siguiente responsable, notifica y registra auditoría/timeline.
- **Integración Google Sheets** (`supabase/functions/google-sheets`): registra cada movimiento en la planilla compartida.
- **Base de datos completa** (`supabase/migrations`): las 4 migraciones ya corridas en el proyecto de Supabase.

## Cómo correrlo localmente (para quien lo vaya a programar)

```bash
npm install
cp .env.local.example .env.local
# completar .env.local con la URL y la anon key de Supabase (Project Settings → API)
npm run dev
```

Abre en `http://localhost:3000`.

## Cómo desplegar la Edge Function del motor de flujo

```bash
supabase functions deploy complete-stage
supabase functions deploy google-sheets
```

(Requiere tener instalado el CLI de Supabase y estar logueado: `npx supabase login`.)

## Qué falta (siguiente etapa)

- Conectar `google-sheets` como efecto disparado desde `complete-stage` (por ahora están separados; se une llamando a `google-sheets` desde `triggerExternalEffects()` en `complete-stage/index.ts`).
- Envío real de correos (`lib/notifications.ts` tiene el punto de conexión listo, falta elegir proveedor — se sugirió Resend).
- Módulo de importación desde Excel (`lib/excel-import.ts`) — la lógica está lista, falta la pantalla en la UI para que un Administrador suba el archivo.
- App móvil en Expo / React Native, reutilizando `lib/types.ts` y `lib/data/proyectos.ts`.
- Componentes de shadcn/ui para reemplazar los estilos inline por un sistema de componentes más pulido.

## Estructura del proyecto

```
app/            → páginas (App Router de Next.js)
components/     → componentes de React reutilizables
lib/            → tipos, conexión a Supabase, lógica de datos
supabase/       → migraciones SQL y Edge Functions (motor de flujo, Sheets)
```
