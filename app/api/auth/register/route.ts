import { NextRequest, NextResponse } from 'next/server'
import { authService, AuthError } from '@/lib/auth'
import { registerSchema } from '@/lib/validators/auth.schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar input
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      console.error('[Register] Validation errors:', fieldErrors)

      // Crear mensaje de error más descriptivo
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
        .join('; ')

      return NextResponse.json(
        {
          error: errorMessages || 'Datos inválidos',
          details: fieldErrors
        },
        { status: 400 }
      )
    }

    // Obtener info del request
    const requestInfo = {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/auth/register',
      method: 'POST',
    }

    // Registrar usuario
    const authResponse = await authService.register(result.data, requestInfo)

    return NextResponse.json({
      success: true,
      message: authResponse.message,
      requiresVerification: authResponse.requiresVerification,
    })
  } catch (error) {
    console.error('[Register] Error:', error)

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
