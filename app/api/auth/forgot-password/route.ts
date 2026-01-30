import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/lib/validators/auth.schema'
import { sendEmail, emailTemplates } from '@/lib/email'
import crypto from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const TOKEN_EXPIRY_HOURS = 1 // Token válido por 1 hora

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar input
    const result = forgotPasswordSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    const { email } = result.data

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        nombres: true,
        apellidoPaterno: true,
        isActive: true,
      },
    })

    // IMPORTANTE: Siempre devolvemos éxito aunque el usuario no exista
    // Esto evita que se pueda enumerar usuarios válidos
    if (!user || !user.isActive) {
      // Simular delay para evitar timing attacks
      await new Promise(resolve => setTimeout(resolve, 500))
      return NextResponse.json({
        success: true,
        message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña',
      })
    }

    // Invalidar tokens anteriores no usados
    await prisma.passwordReset.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    })

    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Calcular fecha de expiración
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS)

    // Guardar en BD
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: token.substring(0, 100), // Solo para referencia, el hash es lo importante
        tokenHash,
        expiresAt,
      },
    })

    // Construir URL de reset
    const resetUrl = `${APP_URL}/restablecer-password?token=${token}`

    // Enviar email
    const userName = `${user.nombres} ${user.apellidoPaterno}`
    const emailContent = emailTemplates.passwordReset(userName, resetUrl, `${TOKEN_EXPIRY_HOURS} hora`)

    const emailSent = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (!emailSent) {
      console.error('[Forgot Password] Error al enviar email a:', user.email)
    }

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUEST',
        entityType: 'User',
        entityId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        requestPath: '/api/auth/forgot-password',
        requestMethod: 'POST',
        status: emailSent ? 'SUCCESS' : 'FAILURE',
        errorMessage: emailSent ? undefined : 'Error al enviar email',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña',
    })
  } catch (error) {
    console.error('[Forgot Password] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
