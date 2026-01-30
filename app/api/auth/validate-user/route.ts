import { NextRequest, NextResponse } from 'next/server'
import { autoDetectUserType, AuthError } from '@/lib/auth'
import { z } from 'zod'

// Schema simplificado - solo necesita el número de documento
const validateUserSchema = z.object({
  numeroDocumento: z.string().min(8, 'El documento debe tener al menos 8 caracteres'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar input
    const result = validateUserSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { numeroDocumento } = result.data

    // Buscar automáticamente en todas las APIs
    // Orden: Estudiante → Docente → RENIEC (Externo)
    const userData = await autoDetectUserType(numeroDocumento)

    if (!userData) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontró información para este número de documento',
          message: 'El DNI no está registrado en el sistema universitario ni en RENIEC',
        },
        { status: 404 }
      )
    }

    // Retornar datos con rol detectado
    return NextResponse.json({
      success: true,
      data: {
        roleCode: userData.tipoUsuario, // Mapear tipoUsuario a roleCode
        dni: userData.dni,
        nombres: userData.nombres,
        apellidoPaterno: userData.apellidoPaterno,
        apellidoMaterno: userData.apellidoMaterno,
        email: userData.email,
        emailPersonal: userData.emailPersonal,
        facultad: userData.facultad,
        escuela: userData.escuela,
        codigoEstudiante: userData.codigoEstudiante,
        codigoDocente: userData.codigoDocente,
        carreras: userData.carreras,
      },
      message: getRoleMessage(userData.tipoUsuario),
    })
  } catch (error) {
    console.error('[ValidateUser] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Error al validar usuario' },
      { status: 500 }
    )
  }
}

function getRoleMessage(roleCode: string): string {
  switch (roleCode) {
    case 'ESTUDIANTE':
      return 'Usuario identificado como estudiante de UNAMAD'
    case 'DOCENTE':
      return 'Usuario identificado como docente de UNAMAD'
    case 'EXTERNO':
      return 'Usuario identificado como persona externa (RENIEC)'
    default:
      return 'Usuario validado'
  }
}
