import { NextRequest, NextResponse } from 'next/server'
import {
  authService,
  verifyAccessToken,
  AuthError,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_OPTIONS,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 1) Intentar con access token
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || null
    }

    if (token) {
      try {
        const payload = await verifyAccessToken(token)
        const user = await authService.me(payload.userId)
        return NextResponse.json({ success: true, user })
      } catch {
        // Access token inválido/expirado → probar refresh abajo
      }
    }

    // 2) Fallback: si hay refresh cookie válido, rotar tokens y responder autenticado
    const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    if (refreshCookie) {
      try {
        const authResponse = await authService.refresh(refreshCookie)

        const response = NextResponse.json({
          success: true,
          user: authResponse.user,
        })

        if (authResponse.accessToken) {
          response.cookies.set(ACCESS_TOKEN_COOKIE, authResponse.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: authResponse.expiresIn ? Math.floor(authResponse.expiresIn / 1000) : 15 * 60,
          })
        }

        if (authResponse.refreshToken) {
          const refreshMaxAge = authResponse.refreshExpiresIn
            ? Math.floor(authResponse.refreshExpiresIn / 1000)
            : 7 * 24 * 60 * 60
          response.cookies.set(REFRESH_TOKEN_COOKIE, authResponse.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: refreshMaxAge,
          })
        }

        return response
      } catch (err) {
        // Distinguir auth-fail permanente vs error transitorio (BD, red interna…)
        if (!(err instanceof AuthError)) {
          console.error('[Auth/me] Error transitorio al refrescar:', err)
          return NextResponse.json(
            {
              success: false,
              user: null,
              code: 'AUTH_TEMPORARILY_UNAVAILABLE',
              message: 'Servicio de autenticación temporalmente no disponible',
            },
            { status: 503 }
          )
        }
        // AuthError → refresh inválido/revocado → usuario no autenticado
      }
    }

    return NextResponse.json({
      success: false,
      user: null,
      message: 'No autenticado',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({
        success: false,
        user: null,
        code: error.code,
      })
    }

    // Error inesperado: tratarlo como transitorio para no desloguear al usuario
    console.error('[Auth/me] Error inesperado:', error)
    return NextResponse.json(
      {
        success: false,
        user: null,
        code: 'AUTH_TEMPORARILY_UNAVAILABLE',
        message: 'Servicio de autenticación temporalmente no disponible',
      },
      { status: 503 }
    )
  }
}
