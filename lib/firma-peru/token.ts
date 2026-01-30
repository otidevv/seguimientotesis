/**
 * Gestión del token JWT de Firma Perú
 */

import axios from 'axios';

// Cache del token en memoria
let cachedToken: string | null = null;
let tokenExpiration: Date | null = null;

/**
 * Decodifica un JWT y obtiene su fecha de expiración
 */
function getJwtExpiration(jwt: string): Date | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verifica si el token actual está vencido
 */
function isTokenExpired(): boolean {
  if (!tokenExpiration) return true;
  // Considerar vencido 5 minutos antes para evitar problemas
  const bufferTime = 5 * 60 * 1000;
  return new Date().getTime() > tokenExpiration.getTime() - bufferTime;
}

/**
 * Obtiene un token válido de Firma Perú
 * Si el token en cache está vigente, lo retorna
 * Si no, solicita uno nuevo
 */
export async function getFirmaPeruToken(): Promise<string | null> {
  const clientId = process.env.PCM_CLIENT_ID;
  const clientSecret = process.env.PCM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('PCM_CLIENT_ID o PCM_CLIENT_SECRET no configurados');
    return null;
  }

  // Verificar si el token en cache está vigente
  if (cachedToken && !isTokenExpired()) {
    return cachedToken;
  }

  try {
    const response = await axios.post(
      'https://apps.firmaperu.gob.pe/admin/api/security/generate-token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const token = response.data;

    if (typeof token === 'string') {
      cachedToken = token;
      tokenExpiration = getJwtExpiration(token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error al obtener token de Firma Perú:', error);
    return null;
  }
}

/**
 * Invalida el token en cache (útil si hay errores de autenticación)
 */
export function invalidateToken(): void {
  cachedToken = null;
  tokenExpiration = null;
}
