import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_TOKEN_COOKIE, AuthError } from '@/lib/auth'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = 'public/uploads/avatars'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

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

    // Verificar token
    const payload = await verifyAccessToken(token)

    // Obtener el archivo del FormData
    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF' },
        { status: 400 }
      )
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo es muy grande. Máximo 5MB' },
        { status: 400 }
      )
    }

    // Crear directorio si no existe
    const uploadPath = path.join(process.cwd(), UPLOAD_DIR)
    if (!existsSync(uploadPath)) {
      await mkdir(uploadPath, { recursive: true })
    }

    // Obtener usuario actual para eliminar avatar anterior
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { avatarUrl: true },
    })

    // Eliminar avatar anterior si existe
    if (user?.avatarUrl) {
      const oldPath = path.join(process.cwd(), 'public', user.avatarUrl)
      if (existsSync(oldPath)) {
        try {
          await unlink(oldPath)
        } catch {
          console.error('[Avatar] Error al eliminar archivo anterior')
        }
      }
    }

    // Generar nombre único
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${payload.userId}-${Date.now()}.${ext}`
    const filePath = path.join(uploadPath, fileName)

    // Guardar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // URL relativa para guardar en BD
    const avatarUrl = `/uploads/avatars/${fileName}`

    // Actualizar usuario
    await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl },
    })

    return NextResponse.json({
      success: true,
      avatarUrl,
      message: 'Foto de perfil actualizada',
    })
  } catch (error) {
    console.error('[Avatar Upload] Error:', error)

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

// DELETE - Eliminar avatar
export async function DELETE(request: NextRequest) {
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

    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { avatarUrl: true },
    })

    if (user?.avatarUrl) {
      // Eliminar archivo
      const filePath = path.join(process.cwd(), 'public', user.avatarUrl)
      if (existsSync(filePath)) {
        try {
          await unlink(filePath)
        } catch {
          console.error('[Avatar] Error al eliminar archivo')
        }
      }

      // Actualizar usuario
      await prisma.user.update({
        where: { id: payload.userId },
        data: { avatarUrl: null },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Foto de perfil eliminada',
    })
  } catch (error) {
    console.error('[Avatar Delete] Error:', error)

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
