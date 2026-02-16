import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params

    // Sanitizar cada segmento para evitar path traversal
    const sanitizedSegments = segments.map((s) => path.basename(s))
    const filePath = path.join(
      process.cwd(),
      'public',
      'documentos',
      ...sanitizedSegments
    )

    // Verificar que el archivo existe
    if (!existsSync(filePath)) {
      return new NextResponse('Archivo no encontrado', { status: 404 })
    }

    // Verificar que la ruta resuelta está dentro del directorio permitido
    const resolvedPath = path.resolve(filePath)
    const allowedDir = path.resolve(
      path.join(process.cwd(), 'public', 'documentos')
    )
    if (!resolvedPath.startsWith(allowedDir)) {
      return new NextResponse('Acceso denegado', { status: 403 })
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    const buffer = await readFile(filePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Error al leer el archivo', { status: 500 })
  }
}
