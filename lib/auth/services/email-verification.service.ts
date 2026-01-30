import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailTemplates } from '@/lib/email'
import { AuthError } from '../types'

const VERIFICATION_TOKEN_EXPIRES_HOURS = 24
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Genera un token de verificación seguro
 */
function generateToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  return { token, tokenHash }
}

/**
 * Crea y envía un email de verificación
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
  userName: string
): Promise<boolean> {
  try {
    // Invalidar tokens anteriores
    await prisma.emailVerification.updateMany({
      where: {
        userId,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    })

    // Generar nuevo token
    const { token, tokenHash } = generateToken()
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000)

    // Guardar en base de datos
    await prisma.emailVerification.create({
      data: {
        userId,
        email,
        token,
        tokenHash,
        expiresAt,
      },
    })

    // Construir URL de verificación
    const verifyUrl = `${APP_URL}/verificar-email?token=${token}`

    // Enviar email
    const template = emailTemplates.emailVerification(userName, verifyUrl)
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (!sent) {
      console.error('[EmailVerification] Failed to send email to:', email)
      return false
    }

    console.log('[EmailVerification] Verification email sent to:', email)
    return true
  } catch (error) {
    console.error('[EmailVerification] Error sending verification email:', error)
    return false
  }
}

/**
 * Verifica un token de email
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; email?: string }> {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Buscar token válido
    const verification = await prisma.emailVerification.findFirst({
      where: {
        tokenHash,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    })

    if (!verification) {
      throw new AuthError('INVALID_TOKEN', 'Token inválido o expirado', 400)
    }

    // Marcar token como usado
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    })

    // Verificar email del usuario
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        isVerified: true,
        emailVerifiedAt: new Date(),
      },
    })

    return {
      success: true,
      userId: verification.userId,
      email: verification.email,
    }
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }
    console.error('[EmailVerification] Error verifying token:', error)
    throw new AuthError('VERIFICATION_ERROR', 'Error al verificar el email', 500)
  }
}

/**
 * Reenvía el email de verificación
 */
export async function resendVerificationEmail(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      // No revelar si el usuario existe o no
      return true
    }

    if (user.isVerified) {
      throw new AuthError('ALREADY_VERIFIED', 'El email ya está verificado', 400)
    }

    const userName = `${user.nombres} ${user.apellidoPaterno}`
    return await sendVerificationEmail(user.id, user.email, userName)
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }
    console.error('[EmailVerification] Error resending verification:', error)
    return false
  }
}
