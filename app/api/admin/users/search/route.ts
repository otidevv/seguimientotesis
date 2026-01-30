import { NextRequest, NextResponse } from 'next/server'
import { fullUserDetection } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const searchSchema = z.object({
  numeroDocumento: z.string().min(8, 'El documento debe tener al menos 8 caracteres'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = searchSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { numeroDocumento } = result.data

    // Verificar si ya existe el usuario
    const existingUser = await prisma.user.findFirst({
      where: { numeroDocumento },
      include: {
        roles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'USER_EXISTS',
        message: 'Ya existe un usuario con este número de documento',
        existingUser: {
          id: existingUser.id,
          nombres: existingUser.nombres,
          apellidoPaterno: existingUser.apellidoPaterno,
          apellidoMaterno: existingUser.apellidoMaterno,
          email: existingUser.email,
          roles: existingUser.roles.map(r => r.role.nombre),
        },
      }, { status: 409 })
    }

    // Buscar en APIs externas
    const detectionResult = await fullUserDetection(numeroDocumento)

    if (!detectionResult) {
      return NextResponse.json({
        success: false,
        error: 'NOT_FOUND',
        message: 'No se encontró información para este número de documento en el sistema universitario ni en RENIEC',
      }, { status: 404 })
    }

    // Obtener los IDs de roles detectados
    const detectedRoleCodes = detectionResult.detectedRoles
    const rolesFromDB = await prisma.role.findMany({
      where: {
        codigo: { in: detectedRoleCodes },
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...detectionResult,
        suggestedRoles: rolesFromDB.map(r => ({
          id: r.id,
          codigo: r.codigo,
          nombre: r.nombre,
          color: r.color,
        })),
      },
      message: detectionResult.detectedRoles.length > 1
        ? `Usuario encontrado con múltiples roles: ${detectionResult.detectedRoles.join(' y ')}`
        : `Usuario encontrado como ${detectionResult.detectedRoles[0]}`,
    })
  } catch (error) {
    console.error('[Admin Search User] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
