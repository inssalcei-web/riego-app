// Normaliza un RUT chileno para comparar sin importar puntos,
// guión o mayúsculas/minúsculas de la "K" ("12.345.678-9",
// "12345678-9" y "12345678-K" se comparan de forma consistente).
export function normalizarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}
