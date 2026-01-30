import { SignJWT, jwtVerify } from 'jose'
import { nanoid } from 'nanoid'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import {
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES,
  REFRESH_TOKEN_REMEMBER_EXPIRES,
} from '../constants'
import type { JwtPayload, RefreshTokenPayload } from '../types'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-in-production')

/**
 * Parsear duracion de tiempo a milisegundos
 */
function parseExpiration(exp: string): number {
  const match = exp.match(/^(\d+)([smhd])$/)
  if (!match) return 15 * 60 * 1000 // default 15 min

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return 15 * 60 * 1000
  }
}

/**
 * Generar Access Token (JWT)
 */
export async function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES)
    .sign(JWT_SECRET)

  return token
}

/**
 * Verificar Access Token
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JwtPayload
  } catch {
    throw new Error('Token inválido o expirado')
  }
}

/**
 * Generar Refresh Token
 */
export async function generateRefreshToken(
  userId: string,
  rememberMe: boolean = false,
  metadata?: { deviceId?: string; ipAddress?: string; userAgent?: string }
): Promise<{ token: string; expiresAt: Date }> {
  const tokenId = nanoid(32)
  const token = nanoid(64)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const expiresIn = parseExpiration(rememberMe ? REFRESH_TOKEN_REMEMBER_EXPIRES : REFRESH_TOKEN_EXPIRES)
  const expiresAt = new Date(Date.now() + expiresIn)

  // Guardar en base de datos
  await prisma.refreshToken.create({
    data: {
      userId,
      token: tokenId,
      tokenHash,
      deviceId: metadata?.deviceId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      expiresAt,
    },
  })

  // Generar JWT del refresh token
  const refreshJwt = await new SignJWT({ userId, tokenId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET)

  return { token: refreshJwt, expiresAt }
}

/**
 * Verificar y validar Refresh Token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const { userId, tokenId } = payload as { userId: string; tokenId: string }

    // Verificar en base de datos
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        userId,
        token: tokenId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!storedToken) {
      throw new Error('Refresh token inválido o revocado')
    }

    // Actualizar último uso
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { lastUsedAt: new Date() },
    })

    return payload as unknown as RefreshTokenPayload
  } catch {
    throw new Error('Refresh token inválido o expirado')
  }
}

/**
 * Revocar Refresh Token
 */
export async function revokeRefreshToken(token: string, reason?: string): Promise<void> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const { tokenId } = payload as { tokenId: string }

    await prisma.refreshToken.updateMany({
      where: { token: tokenId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason || 'User logout',
      },
    })
  } catch {
    // Ignorar errores si el token ya no es válido
  }
}

/**
 * Revocar todos los Refresh Tokens de un usuario
 */
export async function revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason || 'All sessions revoked',
    },
  })
}

/**
 * Generar tokens de autenticación completos
 */
export async function generateTokens(
  user: { id: string; email: string },
  roles: string[],
  rememberMe: boolean = false,
  metadata?: { deviceId?: string; ipAddress?: string; userAgent?: string }
): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
}> {
  const accessToken = await generateAccessToken({
    userId: user.id,
    email: user.email,
    roles,
  })

  const { token: refreshToken } = await generateRefreshToken(user.id, rememberMe, metadata)

  const expiresIn = parseExpiration(ACCESS_TOKEN_EXPIRES)

  return {
    accessToken,
    refreshToken,
    expiresIn,
  }
}

/**
 * Limpiar tokens expirados (para cron job)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isRevoked: true, revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  })

  return result.count
}
