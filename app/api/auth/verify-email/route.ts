import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken, resendVerificationEmail, AuthError } from '@/lib/auth'
import { z } from 'zod'

const verifySchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
})

const resendSchema = z.object({
  email: z.string().email('Email inválido'),
})

// Verificar email con token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = verifySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Token inválido', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const verification = await verifyEmailToken(result.data.token)

    return NextResponse.json({
      success: true,
      message: 'Email verificado correctamente. Ya puedes iniciar sesión.',
      data: {
        email: verification.email,
      },
    })
  } catch (error) {
    console.error('[VerifyEmail] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error al verificar el email' },
      { status: 500 }
    )
  }
}

// Reenviar email de verificación
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const result = resendSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Email inválido', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    await resendVerificationEmail(result.data.email)

    // Siempre responder exitosamente para no revelar si el email existe
    return NextResponse.json({
      success: true,
      message: 'Si el email está registrado, recibirás un correo de verificación.',
    })
  } catch (error) {
    console.error('[ResendVerification] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error al reenviar el email' },
      { status: 500 }
    )
  }
}
