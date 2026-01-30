import { NextRequest, NextResponse } from 'next/server'
import { authService, AuthError, COOKIE_OPTIONS, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth'

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

    // Refrescar tokens
    const authResponse = await authService.refresh(refreshToken)

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
      response.cookies.set(REFRESH_TOKEN_COOKIE, authResponse.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60, // 7 días
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
