import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyAccessToken,
  ACCESS_TOKEN_COOKIE,
  AuthError,
  verifyPassword,
  hashPassword,
} from '@/lib/auth'
import { changePasswordSchema } from '@/lib/validators/auth.schema'

export async function POST(request: NextRequest) {
  try {
    // Obtener token
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || null
    }

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar token
    const payload = await verifyAccessToken(token)

    // Validar body
    const body = await request.json()
    const result = changePasswordSchema.safeParse(body)

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => `${(errors as string[]).join(', ')}`)
        .join('; ')

      return NextResponse.json(
        { error: errorMessages || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = result.data

    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar contraseña actual
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      )
    }

    // Hash de nueva contraseña
    const newPasswordHash = await hashPassword(newPassword)

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    })

    // Log de auditoría
    const requestInfo = {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: '/api/auth/change-password',
      method: 'POST',
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CHANGE_PASSWORD',
        entityType: 'User',
        entityId: user.id,
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        requestPath: requestInfo.path,
        requestMethod: requestInfo.method,
        status: 'SUCCESS',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Contraseña cambiada correctamente',
    })
  } catch (error) {
    console.error('[Change Password] Error:', error)

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
