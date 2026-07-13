// ============================================================
// Módulo 16 — Integración Google Sheets
//
// Recibe el movimiento desde complete-stage y lo agrega como
// fila nueva en la planilla. Si falla, no rompe nada más — solo
// queda registrado en los logs de esta función.
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

Deno.serve(async (req: Request) => {
  try {
    const mov: MovimientoSheet = await req.json();
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
      console.error("Error de Google Sheets:", await res.text());
      return new Response(JSON.stringify({ ok: false }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("Error en integración google-sheets:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
});

// Autenticación con la cuenta de servicio (JWT firmado con la private key)
async function obtenerTokenGoogle(): Promise<string> {
  const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL")!;
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n");

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const unsigned = `${encode(header)}.${encode(claim)}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );

  const signedJwt = `${unsigned}.${arrayBufferToBase64Url(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("No se pudo obtener token de Google: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
