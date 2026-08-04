import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdfkit (usado para el botón "Descargar PDF") necesita sus
  // archivos de fuentes de letra en tiempo de ejecución. Vercel, por
  // defecto, no los incluye en el paquete de la función porque no
  // los detecta como "necesarios" al analizar el código — hay que
  // decírselo explícitamente acá.
  outputFileTracingIncludes: {
    "/api/proyectos/[id]/pdf": ["./node_modules/pdfkit/js/data/**"],
  },
};

export default nextConfig;
