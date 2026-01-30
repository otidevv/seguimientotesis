import { NextRequest, NextResponse } from 'next/server'
import { authService, AuthError, COOKIE_OPTIONS, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth'
import { loginSchema } from '@/lib/validators/auth.schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Obtener info del request
    const requestInfo = {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/auth/login',
      method: 'POST',
    }

    // Autenticar
    const authResponse = await authService.login(result.data, requestInfo)

    // Crear respuesta con cookies
    const response = NextResponse.json({
      success: true,
      user: authResponse.user,
      expiresIn: authResponse.expiresIn,
    })

    // Configurar cookies
    if (authResponse.accessToken) {
      response.cookies.set(ACCESS_TOKEN_COOKIE, authResponse.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: authResponse.expiresIn ? authResponse.expiresIn / 1000 : 15 * 60,
      })
    }

    if (authResponse.refreshToken) {
      response.cookies.set(REFRESH_TOKEN_COOKIE, authResponse.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: result.data.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      })
    }

    return response
  } catch (error) {
    console.error('[Login] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
