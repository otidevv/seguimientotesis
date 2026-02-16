import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/buscar-jurados - Buscar usuarios para asignar como jurados
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const tesisId = searchParams.get('tesisId')

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Ingrese al menos 2 caracteres para buscar',
      })
    }

    // Buscar usuarios activos por nombre, apellido o DNI
    const usuarios = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { nombres: { contains: q, mode: 'insensitive' } },
          { apellidoPaterno: { contains: q, mode: 'insensitive' } },
          { apellidoMaterno: { contains: q, mode: 'insensitive' } },
          { numeroDocumento: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        nombres: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        email: true,
        numeroDocumento: true,
        teacherInfo: {
          select: {
            codigoDocente: true,
            departamentoAcademico: true,
            facultad: { select: { nombre: true } },
          },
        },
        roles: {
          where: { isActive: true },
          select: { role: { select: { codigo: true, nombre: true } } },
        },
      },
      take: 15,
    })

    // Si se especifica tesisId, excluir autores, asesores y jurados ya activos en la fase actual
    let excluirIds: string[] = []
    const fase = searchParams.get('fase') || undefined
    if (tesisId) {
      const tesis = await prisma.thesis.findUnique({
        where: { id: tesisId },
        select: {
          autores: { select: { userId: true } },
          asesores: { select: { userId: true } },
          jurados: {
            where: {
              isActive: true,
              ...(fase && { fase: fase as any }),
            },
            select: { userId: true },
          },
        },
      })

      if (tesis) {
        excluirIds = [
          ...tesis.autores.map((a) => a.userId),
          ...tesis.asesores.map((a) => a.userId),
          ...tesis.jurados.map((j) => j.userId),
        ]
      }
    }

    const resultado = usuarios
      .filter((u) => !excluirIds.includes(u.id))
      .map((u) => ({
        id: u.id,
        nombres: u.nombres,
        apellidoPaterno: u.apellidoPaterno,
        apellidoMaterno: u.apellidoMaterno,
        nombreCompleto: `${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`,
        email: u.email,
        numeroDocumento: u.numeroDocumento,
        esDocente: !!u.teacherInfo,
        codigoDocente: u.teacherInfo?.codigoDocente || null,
        departamento: u.teacherInfo?.departamentoAcademico || null,
        facultad: u.teacherInfo?.facultad?.nombre || null,
        roles: u.roles.map((r) => r.role.nombre),
      }))

    return NextResponse.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error('[GET /api/buscar-jurados] Error:', error)
    return NextResponse.json({ error: 'Error al buscar jurados' }, { status: 500 })
  }
}
