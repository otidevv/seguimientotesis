import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resetPasswordSchema } from '@/lib/validators/auth.schema'
import { hashPassword } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar input
    const result = resetPasswordSchema.safeParse(body)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const errorMessages = Object.entries(fieldErrors)
        .map(([, errors]) => `${(errors as string[]).join(', ')}`)
        .join('; ')

      return NextResponse.json(
        { error: errorMessages || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { token, password } = result.data

    // Hashear el token para buscar en BD
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Buscar token válido
    const resetToken = await prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    })

    // Validar token
    if (!resetToken) {
      return NextResponse.json(
        { error: 'El enlace es inválido o ha expirado' },
        { status: 400 }
      )
    }

    if (resetToken.isUsed) {
      return NextResponse.json(
        { error: 'Este enlace ya fue utilizado' },
        { status: 400 }
      )
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'El enlace ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    if (!resetToken.user.isActive) {
      return NextResponse.json(
        { error: 'La cuenta está desactivada' },
        { status: 400 }
      )
    }

    // Hashear nueva contraseña
    const passwordHash = await hashPassword(password)

    // Actualizar contraseña y marcar token como usado
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          updatedAt: new Date(),
          // Reset de intentos fallidos
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordReset.update({
        where: { id: resetToken.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
    ])

    // Revocar todos los refresh tokens del usuario (cerrar otras sesiones)
    await prisma.refreshToken.updateMany({
      where: {
        userId: resetToken.userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'Password reset',
      },
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: resetToken.userId,
        action: 'PASSWORD_RESET_COMPLETE',
        entityType: 'User',
        entityId: resetToken.userId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        requestPath: '/api/auth/reset-password',
        requestMethod: 'POST',
        status: 'SUCCESS',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
    })
  } catch (error) {
    console.error('[Reset Password] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
