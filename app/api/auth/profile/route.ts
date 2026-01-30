import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_TOKEN_COOKIE, AuthError } from '@/lib/auth'
import { z } from 'zod'

// Schema para actualizar perfil
const updateProfileSchema = z.object({
  emailPersonal: z.string().email('Email personal inválido').optional().or(z.literal('')),
})

// GET - Obtener datos del perfil (carreras, info docente)
export async function GET(request: NextRequest) {
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

    // Obtener usuario con sus datos académicos
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        roles: {
          where: { isActive: true },
          select: {
            role: {
              select: {
                codigo: true,
              },
            },
          },
        },
        studentCareers: {
          select: {
            id: true,
            codigoEstudiante: true,
            carreraNombre: true,
            creditosAprobados: true,
            isActive: true,
            facultadId: true,
            facultad: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
          orderBy: { isActive: 'desc' },
        },
        teacherInfo: {
          select: {
            codigoDocente: true,
            departamentoAcademico: true,
            facultad: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Formatear respuesta según roles del usuario
    const response: {
      carreras?: Array<{
        id: string
        codigoEstudiante: string
        carreraNombre: string
        facultadId: string
        facultad: {
          id: string
          nombre: string
        }
        creditosAprobados: number
        isActive: boolean
      }>
      docenteInfo?: {
        codigoDocente: string
        departamentoAcademico: string
        facultadNombre: string
      }
    } = {}

    // Check roles
    const userRoleCodes = user.roles.map((r) => r.role.codigo)
    const isEstudiante = userRoleCodes.includes('ESTUDIANTE')
    const isDocente = userRoleCodes.includes('DOCENTE')

    if (isEstudiante && user.studentCareers.length > 0) {
      response.carreras = user.studentCareers.map((c) => ({
        id: c.id,
        codigoEstudiante: c.codigoEstudiante,
        carreraNombre: c.carreraNombre,
        facultadId: c.facultadId,
        facultad: {
          id: c.facultad.id,
          nombre: c.facultad.nombre,
        },
        creditosAprobados: Number(c.creditosAprobados) || 0,
        isActive: c.isActive,
      }))
    }

    if (isDocente && user.teacherInfo) {
      response.docenteInfo = {
        codigoDocente: user.teacherInfo.codigoDocente,
        departamentoAcademico: user.teacherInfo.departamentoAcademico,
        facultadNombre: user.teacherInfo.facultad.nombre,
      }
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('[Profile GET] Error:', error)

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

// PUT - Actualizar perfil
export async function PUT(request: NextRequest) {
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
    const result = updateProfileSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        emailPersonal: result.data.emailPersonal || null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        emailPersonal: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: updatedUser,
    })
  } catch (error) {
    console.error('[Profile PUT] Error:', error)

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
