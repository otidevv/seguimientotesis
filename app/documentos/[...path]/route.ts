import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

// Roles con acceso global a documentos por su función operativa.
const ROLES_GLOBALES = new Set(['ADMIN', 'SUPER_ADMIN', 'MESA_PARTES'])

/**
 * Sirve documentos privados desde public/documentos. Antes este endpoint NO
 * validaba autenticación: cualquiera con la URL podía descargar PDFs de tesis
 * ajenas. Ahora exige sesión y comprueba que el user está vinculado a la tesis
 * (autor, coautor, asesor, coasesor, jurado) o tiene rol operativo (mesa-partes / admin).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return new NextResponse('No autorizado', { status: 401 })
    }

    const { path: segments } = await params
    if (!segments || segments.length === 0) {
      return new NextResponse('Path inválido', { status: 400 })
    }

    // Sanitizar cada segmento para evitar path traversal
    const sanitizedSegments = segments.map((s) => path.basename(s))
    const requestedRoute = '/documentos/' + sanitizedSegments.join('/')

    // Identificar la tesis a la que pertenece el archivo.
    let thesisId: string | null = null
    const tipo = sanitizedSegments[0]

    if (tipo === 'tesis' && sanitizedSegments[1]) {
      // Estructura: /documentos/tesis/{thesisId}/...
      thesisId = sanitizedSegments[1]
    } else if (tipo === 'cartas-aceptacion') {
      // El thesisId no está en el path; resolver via BD por la rutaArchivo del documento.
      const doc = await prisma.thesisDocument.findFirst({
        where: { rutaArchivo: requestedRoute },
        select: { thesisId: true },
      })
      if (!doc) {
        return new NextResponse('Archivo no encontrado', { status: 404 })
      }
      thesisId = doc.thesisId
    } else {
      // Tipo no reconocido — denegar para evitar exponer archivos sueltos en public/documentos.
      return new NextResponse('Acceso denegado', { status: 403 })
    }

    if (!thesisId) {
      return new NextResponse('Acceso denegado', { status: 403 })
    }

    // ¿El user tiene un rol operativo global (mesa-partes / admin)?
    const tieneRolGlobal = user.roles?.some(
      (r) => ROLES_GLOBALES.has(r.role.codigo) && r.isActive
    ) ?? false

    if (!tieneRolGlobal) {
      // Validar relación con la tesis (autor, asesor o jurado).
      const [autor, asesor, jurado] = await Promise.all([
        prisma.thesisAuthor.findFirst({
          where: { thesisId, userId: user.id },
          select: { id: true },
        }),
        prisma.thesisAdvisor.findFirst({
          where: { thesisId, userId: user.id },
          select: { id: true },
        }),
        prisma.thesisJury.findFirst({
          where: { thesisId, userId: user.id, isActive: true },
          select: { id: true },
        }),
      ])
      if (!autor && !asesor && !jurado) {
        return new NextResponse('Acceso denegado', { status: 403 })
      }
    }

    // Resolver path físico
    const filePath = path.join(
      process.cwd(),
      'public',
      'documentos',
      ...sanitizedSegments
    )

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
        // Documentos privados — evitar que proxies/CDN cacheen y filtren el contenido
        // a otros usuarios. El cache previo (`public, max-age=86400`) hacía el bug #1
        // potencialmente más explotable a través de intermediarios.
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    })
  } catch (error) {
    console.error('[GET /documentos/[...path]] Error:', error)
    return new NextResponse('Error al leer el archivo', { status: 500 })
  }
}
