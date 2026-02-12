import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars')

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    // Sanitizar nombre de archivo para evitar path traversal
    const sanitized = path.basename(filename)
    const filePath = path.join(UPLOAD_DIR, sanitized)

    if (!existsSync(filePath)) {
      return new NextResponse(null, { status: 404 })
    }

    const ext = path.extname(sanitized).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    const buffer = await readFile(filePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
