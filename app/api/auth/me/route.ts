import { NextRequest, NextResponse } from 'next/server'
import { authService, verifyAccessToken, AuthError, ACCESS_TOKEN_COOKIE } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Obtener token del header o cookie
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || null
    }

    // Si no hay token, devolver null en lugar de error
    // Esto es más limpio para el frontend
    if (!token) {
      return NextResponse.json({
        success: false,
        user: null,
        message: 'No autenticado',
      })
    }

    // Verificar token
    const payload = await verifyAccessToken(token)

    // Obtener usuario actual
    const user = await authService.me(payload.userId)

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    // No loguear errores de token inválido (es esperado)
    if (error instanceof AuthError) {
      return NextResponse.json({
        success: false,
        user: null,
        code: error.code,
      })
    }

    // Token expirado o inválido - devolver respuesta limpia
    return NextResponse.json({
      success: false,
      user: null,
      message: 'Sesión expirada',
    })
  }
}
