import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/tesis/buscar-docentes - Buscar docentes para agregar como asesores
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
    const facultadId = searchParams.get('facultadId')

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Ingrese al menos 2 caracteres para buscar',
      })
    }

    // Buscar docentes por nombre, apellido o número de documento
    const docentes = await prisma.teacherInfo.findMany({
      where: {
        // Filtrar por facultad si se especifica
        ...(facultadId && { facultadId }),
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
          // Verificar que tenga rol de docente
          roles: {
            some: {
              role: { codigo: 'DOCENTE' },
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
    const resultado = docentes
      .filter((d) => d.user) // Solo incluir registros con usuario válido
      .map((d) => ({
        id: d.user.id,
        visibleId: d.id, // ID del registro TeacherInfo
        numeroDocumento: d.user.numeroDocumento,
        nombres: d.user.nombres,
        apellidoPaterno: d.user.apellidoPaterno,
        apellidoMaterno: d.user.apellidoMaterno,
        nombreCompleto: `${d.user.nombres} ${d.user.apellidoPaterno} ${d.user.apellidoMaterno}`,
        email: d.user.email,
        codigoDocente: d.codigoDocente,
        departamento: d.departamentoAcademico,
        facultad: d.facultad?.nombre || 'Sin facultad',
        facultadId: d.facultad?.id || null,
      }))

    return NextResponse.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error('[GET /api/tesis/buscar-docentes] Error:', error)
    return NextResponse.json(
      { error: 'Error al buscar docentes' },
      { status: 500 }
    )
  }
}
