import { NextRequest, NextResponse } from 'next/server'
import { authService, REFRESH_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    const userId = request.headers.get('x-user-id') || undefined

    const requestInfo = {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/auth/logout',
      method: 'POST',
    }

    if (refreshToken) {
      await authService.logout(refreshToken, requestInfo, userId)
    }

    // Crear respuesta y eliminar cookies
    const response = NextResponse.json({ success: true, message: 'Sesión cerrada' })

    response.cookies.delete(ACCESS_TOKEN_COOKIE)
    response.cookies.delete(REFRESH_TOKEN_COOKIE)

    return response
  } catch (error) {
    console.error('[Logout] Error:', error)

    // Aún así eliminar cookies
    const response = NextResponse.json({ success: true, message: 'Sesión cerrada' })
    response.cookies.delete(ACCESS_TOKEN_COOKIE)
    response.cookies.delete(REFRESH_TOKEN_COOKIE)

    return response
  }
}
