import { NextRequest, NextResponse } from 'next/server'
import { authService, verifyAccessToken, ACCESS_TOKEN_COOKIE, AuthError } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || null
    }

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyAccessToken(token)

    const requestInfo = {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/auth/logout-all',
      method: 'POST',
    }

    await authService.logoutAll(payload.userId, requestInfo)

    // Limpiar cookies
    const response = NextResponse.json({
      success: true,
      message: 'Todas las sesiones han sido cerradas',
    })

    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  } catch (error) {
    console.error('[LogoutAll] Error:', error)

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
