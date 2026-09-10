"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ProyectoConDetalle, ROLES_CREAR_PROYECTO } from "@/lib/types";
import { CollapsibleProjectCard } from "@/components/CollapsibleProjectCard";
import { RetomarProyectoCard } from "@/components/RetomarProyectoCard";

interface FaseSimple {
  id: string;
  orden: number;
  nombre: string;
}

interface ProyectoPendienteRetomar {
  id: string;
  codigo_proyecto: string;
  nombre_agricultor: string;
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes tras la normalización NFD
    .toLowerCase()
    .trim();
}

export function TableroProyectos({
  fases,
  proyectosActivos,
  proyectosTerminados,
  proyectosArchivados,
  proyectosPendientesRetomar,
  usuario,
}: {
  fases: FaseSimple[];
  proyectosActivos: ProyectoConDetalle[];
  proyectosTerminados: ProyectoConDetalle[];
  proyectosArchivados: ProyectoConDetalle[];
  proyectosPendientesRetomar: ProyectoPendienteRetomar[];
  usuario: { id: string; rol_id: string } | null;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [terminoBuscado, setTerminoBuscado] = useState("");
  const [idsResaltados, setIdsResaltados] = useState<Set<string>>(new Set());

  const primeraFase = fases[0];

  // El código de proyecto se busca por coincidencia parcial (no hay
  // ambigüedad posible), pero el nombre de agricultor se busca por
  // coincidencia EXACTA (normalizada) — muchos proyectos comparten
  // las primeras palabras del nombre (ej. "Canal ..."), así que una
  // búsqueda parcial por nombre devolvía demasiados resultados.
  const resultadoBusqueda = useMemo(() => {
    const q = normalizar(terminoBuscado);
    if (q.length < 2) return null;

    const coincide = (p: ProyectoConDetalle) =>
      normalizar(p.codigo_proyecto ?? "").includes(q) || normalizar(p.nombre_agricultor ?? "") === q;

    return {
      activosTerminados: [...proyectosActivos, ...proyectosTerminados].filter(coincide),
      archivados: proyectosArchivados.filter(coincide),
    };
  }, [terminoBuscado, proyectosActivos, proyectosTerminados, proyectosArchivados]);

  function buscar() {
    setTerminoBuscado(busqueda);
  }

  function onKeyDownBusqueda(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      buscar();
    }
    // Si el usuario borra todo el texto y presiona Enter (o borra y
    // sigue escribiendo), se apaga la búsqueda activa automáticamente
    // más abajo (ver el useEffect que vigila `busqueda`).
  }

  // Si el usuario borra el contenido del campo de búsqueda, se
  // desactiva la búsqueda activa (y por lo tanto el resaltado),
  // sin necesidad de volver a presionar Enter.
  useEffect(() => {
    if (busqueda.trim().length === 0 && terminoBuscado.length > 0) {
      setTerminoBuscado("");
    }
  }, [busqueda, terminoBuscado]);

  // Cada vez que cambia el resultado de una búsqueda nueva, se
  // resaltan sus coincidencias (hasta que el usuario haga clic en
  // alguna, momento en el que se apaga solo esa tarjeta).
  useEffect(() => {
    if (resultadoBusqueda) {
      setIdsResaltados(new Set(resultadoBusqueda.activosTerminados.map((p) => p.id)));
    } else {
      setIdsResaltados(new Set());
    }
  }, [resultadoBusqueda]);

  function quitarResaltado(id: string) {
    setIdsResaltados((prev) => {
      const copia = new Set(prev);
      copia.delete(id);
      return copia;
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={onKeyDownBusqueda}
            placeholder="Buscar por código o agricultor... (Enter para buscar)"
            className="w-full h-9 pl-8 pr-3 rounded-md border text-base"
            style={{ borderColor: "var(--border-default)" }}
          />
          <button
            type="button"
            onClick={buscar}
            aria-label="Buscar"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            🔍
          </button>
        </div>

        {usuario && ROLES_CREAR_PROYECTO.includes(usuario.rol_id) && (
          <Link
            href="/proyectos/nuevo"
            className="text-base px-4 py-2 rounded-lg text-white font-medium text-center"
            style={{ background: "#3B82F6" }}
          >
            + Crear nuevo proyecto
          </Link>
        )}
      </div>

      {resultadoBusqueda && (
        <div className="mb-3">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {resultadoBusqueda.activosTerminados.length === 0 && resultadoBusqueda.archivados.length === 0
              ? "No se encontraron proyectos con ese código de proyecto, o con ese nombre completo exacto de agricultor."
              : `${resultadoBusqueda.activosTerminados.length + resultadoBusqueda.archivados.length} proyecto(s) encontrado(s).`}
          </p>

          {resultadoBusqueda.archivados.length > 0 && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {resultadoBusqueda.archivados.map((p) => (
                <Link
                  key={p.id}
                  href={`/archivados?resaltar=${p.id}`}
                  className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md border"
                  style={{ borderColor: "var(--border-default)", background: "var(--surface-page)" }}
                >
                  <span>
                    <span className="font-medium">{p.codigo_proyecto ?? "Sin código"}</span>
                    {" — "}
                    <span style={{ color: "var(--text-secondary)" }}>{p.nombre_agricultor ?? "—"}</span>
                  </span>
                  <span style={{ color: "#3B82F6" }}>Archivado · ver →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {fases.map((fase) => {
          const proyectosDeLaFase = proyectosActivos.filter((p) => p.fase_id === fase.id);
          const esPrimeraFase = primeraFase && fase.id === primeraFase.id;

          return (
            <div key={fase.id}>
              <p className="text-sm font-medium mb-2.5" style={{ color: "var(--text-secondary)" }}>
                {fase.orden} · {fase.nombre}
                <span className="ml-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                  ({proyectosDeLaFase.length})
                </span>
              </p>

              {esPrimeraFase &&
                proyectosPendientesRetomar.map((p) => (
                  <RetomarProyectoCard
                    key={p.id}
                    proyectoId={p.id}
                    codigoProyecto={p.codigo_proyecto ?? "Sin código"}
                    nombreAgricultor={p.nombre_agricultor ?? "Agricultor sin definir"}
                    usuarioId={usuario!.id}
                  />
                ))}

              {proyectosDeLaFase.length === 0 && proyectosPendientesRetomar.length === 0 && (
                <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
                  Sin proyectos
                </p>
              )}
              {proyectosDeLaFase.map((p) => (
                <CollapsibleProjectCard
                  key={p.id}
                  proyecto={p}
                  rolUsuario={usuario?.rol_id ?? null}
                  usuarioId={usuario?.id ?? null}
                  resaltada={idsResaltados.has(p.id)}
                  onClickTarjeta={() => quitarResaltado(p.id)}
                />
              ))}
            </div>
          );
        })}

        <div>
          <p className="text-sm font-medium mb-2.5" style={{ color: "var(--status-on-track-text)" }}>
            ✓ Proyectos terminados
            <span className="ml-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              ({proyectosTerminados.length})
            </span>
          </p>
          {proyectosTerminados.length === 0 && (
            <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
              Sin proyectos
            </p>
          )}
          {proyectosTerminados.map((p) => (
            <CollapsibleProjectCard
              key={p.id}
              proyecto={p}
              rolUsuario={usuario?.rol_id ?? null}
              usuarioId={usuario?.id ?? null}
              resaltada={idsResaltados.has(p.id)}
              onClickTarjeta={() => quitarResaltado(p.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
