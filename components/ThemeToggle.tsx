"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [modo, setModo] = useState<"light" | "dark">("light");

  useEffect(() => {
    const guardado = localStorage.getItem("riego-app-theme");
    const inicial = guardado === "dark" ? "dark" : "light";
    setModo(inicial);
    document.documentElement.setAttribute("data-mode", inicial);
  }, []);

  function alternar() {
    const nuevo = modo === "dark" ? "light" : "dark";
    setModo(nuevo);
    document.documentElement.setAttribute("data-mode", nuevo);
    localStorage.setItem("riego-app-theme", nuevo);
  }

  return (
    <button
      onClick={alternar}
      aria-label="Cambiar entre modo claro y oscuro"
      className="text-sm px-2 py-1 rounded-md"
      style={{ color: "var(--text-secondary)" }}
    >
      {modo === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}
