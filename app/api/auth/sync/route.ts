import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyAccessToken,
  ACCESS_TOKEN_COOKIE,
  AuthError,
  validateStudentExternal,
  validateTeacherExternal,
} from '@/lib/auth'

/**
 * Mapeo de nombres de facultades antiguas a las actuales
 */
const FACULTAD_ALIAS: Record<string, string> = {
  'Facultad de Ecoturismo': 'Facultad de Ciencias Empresariales',
  'Ecoturismo': 'Facultad de Ciencias Empresariales',
}

function normalizarNombreFacultad(nombre: string): string {
  if (FACULTAD_ALIAS[nombre]) {
    return FACULTAD_ALIAS[nombre]
  }
  for (const [alias, nombreReal] of Object.entries(FACULTAD_ALIAS)) {
    if (nombre.toLowerCase().includes(alias.toLowerCase())) {
      return nombreReal
    }
  }
  return nombre
}

async function findOrCreateFaculty(facultadNombre: string) {
  const nombre = normalizarNombreFacultad(facultadNombre)

  let faculty = await prisma.faculty.findFirst({
    where: { nombre: { contains: nombre, mode: 'insensitive' } },
  })

  if (!faculty) {
    const codigo = nombre.substring(0, 3).toUpperCase()
    faculty = await prisma.faculty.create({
      data: {
        nombre,
        codigo: `${codigo}_${Date.now()}`,
      },
    })
  }

  return faculty
}

// POST - Sincronizar datos académicos con UNAMAD
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

    const payload = await verifyAccessToken(token)

    // Obtener usuario con roles y documento
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        numeroDocumento: true,
        roles: {
          where: { isActive: true },
          select: { role: { select: { codigo: true } } },
        },
        studentCareers: {
          select: { id: true, codigoEstudiante: true },
        },
        teacherInfo: {
          select: { id: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const roleCodes = user.roles.map((r) => r.role.codigo)
    const isEstudiante = roleCodes.includes('ESTUDIANTE')
    const isDocente = roleCodes.includes('DOCENTE')

    if (!isEstudiante && !isDocente) {
      return NextResponse.json(
        { error: 'Solo estudiantes y docentes pueden sincronizar datos' },
        { status: 400 }
      )
    }

    const changes: string[] = []

    // Sincronizar datos de estudiante
    if (isEstudiante) {
      const studentData = await validateStudentExternal(user.numeroDocumento)

      if (!studentData) {
        return NextResponse.json(
          { error: 'No se pudo conectar con el sistema universitario. Intenta más tarde.' },
          { status: 502 }
        )
      }

      // Mapa de carreras existentes por codigoEstudiante
      const existingCareers = new Map(
        user.studentCareers.map((c) => [c.codigoEstudiante, c.id])
      )

      for (const carrera of studentData.carreras) {
        const faculty = await findOrCreateFaculty(carrera.facultadNombre)
        const existingId = existingCareers.get(carrera.codigoEstudiante)

        if (existingId) {
          // Actualizar carrera existente
          await prisma.studentCareer.update({
            where: { id: existingId },
            data: {
              carreraNombre: carrera.carreraNombre,
              facultadId: faculty.id,
              creditosAprobados: carrera.creditosAprobados,
            },
          })
          changes.push(`Carrera ${carrera.carreraNombre} actualizada`)
          existingCareers.delete(carrera.codigoEstudiante)
        } else {
          // Crear nueva carrera
          await prisma.studentCareer.create({
            data: {
              userId: user.id,
              codigoEstudiante: carrera.codigoEstudiante,
              carreraNombre: carrera.carreraNombre,
              facultadId: faculty.id,
              creditosAprobados: carrera.creditosAprobados,
            },
          })
          changes.push(`Nueva carrera agregada: ${carrera.carreraNombre}`)
        }
      }

      // Desactivar carreras que ya no aparecen en la API
      for (const [codigo, id] of existingCareers) {
        await prisma.studentCareer.update({
          where: { id },
          data: { isActive: false },
        })
        changes.push(`Carrera con código ${codigo} marcada como inactiva`)
      }
    }

    // Sincronizar datos de docente
    if (isDocente) {
      const teacherData = await validateTeacherExternal(user.numeroDocumento)

      if (!teacherData) {
        if (!isEstudiante) {
          return NextResponse.json(
            { error: 'No se pudo conectar con el sistema universitario. Intenta más tarde.' },
            { status: 502 }
          )
        }
        // Si es estudiante+docente y falla el docente, continuar con lo que se sincronizó
      } else {
        const faculty = await findOrCreateFaculty(teacherData.facultadNombre)

        if (user.teacherInfo) {
          await prisma.teacherInfo.update({
            where: { id: user.teacherInfo.id },
            data: {
              codigoDocente: teacherData.codigoDocente,
              departamentoAcademico: teacherData.departamentoAcademico,
              facultadId: faculty.id,
            },
          })
          changes.push('Información de docente actualizada')
        } else {
          await prisma.teacherInfo.create({
            data: {
              userId: user.id,
              codigoDocente: teacherData.codigoDocente,
              departamentoAcademico: teacherData.departamentoAcademico,
              facultadId: faculty.id,
            },
          })
          changes.push('Información de docente creada')
        }
      }
    }

    // Actualizar timestamp de sincronización
    await prisma.user.update({
      where: { id: user.id },
      data: {
        externalDataSyncAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: changes.length > 0
        ? 'Datos sincronizados correctamente'
        : 'Los datos ya están actualizados',
      changes,
    })
  } catch (error) {
    console.error('[Sync] Error:', error)

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
