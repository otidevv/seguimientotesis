// Exportaciones principales del módulo de autenticación

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from './services/token.service'
import { ACCESS_TOKEN_COOKIE } from './constants'

// Tipos
export * from './types'

// Constantes
export * from './constants'

// Servicios
export { authService } from './services/auth.service'
export { hashPassword, verifyPassword, validatePasswordStrength } from './services/password.service'
export {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  generateTokens,
  cleanupExpiredTokens,
} from './services/token.service'
export {
  validateStudentExternal,
  validateTeacherExternal,
  validateExternalUser,
  autoDetectUserType,
  fullUserDetection,
} from './services/external-api.service'
export type { ExternalUserData, FullDetectionResult } from './services/external-api.service'
export {
  sendVerificationEmail,
  verifyEmailToken,
  resendVerificationEmail,
} from './services/email-verification.service'

// Helper para obtener el usuario actual desde una request
export async function getCurrentUser(request: NextRequest) {
  try {
    // Obtener token del header o cookie
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || null
    }

    if (!token) {
      return null
    }

    // Verificar token
    const payload = await verifyAccessToken(token)

    // Obtener usuario con sus roles
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        nombres: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        isActive: true,
        roles: {
          where: { isActive: true },
          select: {
            role: {
              select: {
                codigo: true,
              },
            },
            isActive: true,
            contextType: true,
            contextId: true,
          },
        },
      },
    })

    return user
  } catch {
    return null
  }
}
