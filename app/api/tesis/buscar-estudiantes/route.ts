import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/tesis/buscar-estudiantes - Buscar estudiantes para agregar como coautores
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const carrera = searchParams.get('carrera')

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Ingrese al menos 2 caracteres para buscar',
      })
    }

    // Buscar estudiantes por nombre, apellido o número de documento
    const estudiantes = await prisma.studentCareer.findMany({
      where: {
        isActive: true,
        // Excluir al usuario actual
        userId: { not: user.id },
        // Filtrar por carrera si se especifica
        ...(carrera && { carreraNombre: carrera }),
        // Buscar por datos del usuario
        user: {
          isActive: true,
          deletedAt: null,
          OR: [
            { nombres: { contains: q, mode: 'insensitive' } },
            { apellidoPaterno: { contains: q, mode: 'insensitive' } },
            { apellidoMaterno: { contains: q, mode: 'insensitive' } },
            { numeroDocumento: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
          // Verificar que tenga rol de estudiante
          roles: {
            some: {
              role: { codigo: 'ESTUDIANTE' },
              isActive: true,
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            numeroDocumento: true,
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            email: true,
          },
        },
        facultad: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      take: 10,
    })

    // Formatear respuesta
    const resultado = estudiantes
      .filter((e) => e.user) // Solo incluir registros con usuario válido
      .map((e) => ({
        id: e.user.id,
        visibleId: e.id, // ID del registro StudentCareer
        numeroDocumento: e.user.numeroDocumento,
        nombres: e.user.nombres,
        apellidoPaterno: e.user.apellidoPaterno,
        apellidoMaterno: e.user.apellidoMaterno,
        nombreCompleto: `${e.user.nombres} ${e.user.apellidoPaterno} ${e.user.apellidoMaterno}`,
        email: e.user.email,
        codigoEstudiante: e.codigoEstudiante,
        carrera: e.carreraNombre,
        facultad: e.facultad?.nombre || 'Sin facultad',
        studentCareerId: e.id,
      }))

    return NextResponse.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error('[GET /api/tesis/buscar-estudiantes] Error:', error)
    return NextResponse.json(
      { error: 'Error al buscar estudiantes' },
      { status: 500 }
    )
  }
}
