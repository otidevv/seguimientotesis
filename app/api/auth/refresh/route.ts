import { NextRequest, NextResponse } from 'next/server'
import { authService, AuthError, COOKIE_OPTIONS, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth'
import type { AuthResponse } from '@/lib/auth'

// Deduplicación in-memory de refreshes concurrentes con el MISMO refresh token
// (p.ej. una página que dispara varios fetch en paralelo). Sin esto cada request
// rotaría el token y crearía una fila en refresh_tokens.
const inFlightRefreshes = new Map<string, Promise<AuthResponse>>()

export async function POST(request: NextRequest) {
  try {
    // Obtener refresh token de cookie o body
    let refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

    if (!refreshToken) {
      const body = await request.json().catch(() => ({}))
      refreshToken = body.refreshToken
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token no proporcionado' },
        { status: 401 }
      )
    }

    // Refrescar tokens (dedupe por refreshToken)
    let pending = inFlightRefreshes.get(refreshToken)
    if (!pending) {
      pending = authService.refresh(refreshToken)
      inFlightRefreshes.set(refreshToken, pending)
      pending.finally(() => {
        // Mantener la entrada unos segundos para cubrir requests que lleguen
        // justo después de resolver, y evitar rotaciones redundantes.
        setTimeout(() => inFlightRefreshes.delete(refreshToken!), 3000)
      })
    }
    const authResponse = await pending

    // Crear respuesta con nuevas cookies
    const response = NextResponse.json({
      success: true,
      user: authResponse.user,
      expiresIn: authResponse.expiresIn,
    })

    // Configurar nuevas cookies
    if (authResponse.accessToken) {
      response.cookies.set(ACCESS_TOKEN_COOKIE, authResponse.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: authResponse.expiresIn ? authResponse.expiresIn / 1000 : 15 * 60,
      })
    }

    if (authResponse.refreshToken) {
      // Usar la duración real (rememberMe preserva hasta 30d; normal 7d)
      const refreshMaxAge = authResponse.refreshExpiresIn
        ? Math.floor(authResponse.refreshExpiresIn / 1000)
        : 7 * 24 * 60 * 60
      response.cookies.set(REFRESH_TOKEN_COOKIE, authResponse.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: refreshMaxAge,
      })
    }

    return response
  } catch (error) {
    console.error('[Refresh] Error:', error)

    if (error instanceof AuthError) {
      // Limpiar cookies si el token es inválido
      const response = NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
      response.cookies.delete(ACCESS_TOKEN_COOKIE)
      response.cookies.delete(REFRESH_TOKEN_COOKIE)
      return response
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
