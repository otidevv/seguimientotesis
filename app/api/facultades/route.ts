import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/facultades - Listar todas las facultades
export async function GET() {
  try {
    const facultades = await prisma.faculty.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: facultades,
    })
  } catch (error) {
    console.error('[GET /api/facultades] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener facultades' },
      { status: 500 }
    )
  }
}
