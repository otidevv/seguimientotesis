import { UNAMAD_STUDENT_API_URL, UNAMAD_TEACHER_API_URL, UNAMAD_RENIEC_API_URL, UNAMAD_API_TOKEN } from '../constants'
import { AuthError } from '../types'
import type { ExternalStudentData, ExternalTeacherData } from '../types'

// ============================================
// TIPOS DE RESPUESTA DE APIs
// ============================================

interface StudentAPIResponse {
  info: {
    username: string
    dni: string
    name: string
    paternalSurname: string
    maternalSurname: string
    email: string
    personalEmail: string | null
    carrerName: string
    facultyName: string
  }
  totalCreditsApproved: number
}

interface StudentAPIResult {
  status: string
  data: StudentAPIResponse[]
  message: string
}

interface TeacherAPIResult {
  userName: string
  dni: string
  name: string
  paternalSurname: string
  maternalSurname: string
  email: string
  personalEmail: string | null
  academicDepartament: string
  facultyName: string
}

interface ReniecAPIResult {
  id: number
  DNI: string
  AP_PAT: string
  AP_MAT: string
  NOMBRES: string
  FECHA_NAC: string
  FCH_INSCRIPCION: string
  FCH_EMISION: string
  FCH_CADUCIDAD: string
  UBIGEO_NAC: string
  UBIGEO_DIR: string
  DIRECCION: string
  SEXO: string
  EST_CIVIL: string
  DIG_RUC: string
  MADRE: string
  PADRE: string
}

// Tipo unificado para datos externos
export interface ExternalUserData {
  tipoUsuario: 'ESTUDIANTE' | 'DOCENTE' | 'EXTERNO'
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string | null
  emailPersonal: string | null
  facultad: string | null
  escuela: string | null
  codigoEstudiante: string | null
  codigoDocente: string | null
  carreras?: {
    codigoEstudiante: string
    carreraNombre: string
    facultadNombre: string
    creditosAprobados: number
  }[]
}

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

/**
 * Validar estudiante contra API externa de UNAMAD
 */
export async function validateStudentExternal(numeroDocumento: string): Promise<ExternalStudentData | null> {
  try {
    const url = `${UNAMAD_STUDENT_API_URL}/${numeroDocumento}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${UNAMAD_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      console.log('[External API] Estudiante no encontrado:', response.status)
      return null
    }

    const result: StudentAPIResult = await response.json()

    if (result.status !== 'success' || !result.data || result.data.length === 0) {
      return null
    }

    // Procesar múltiples carreras
    const carreras = result.data.map((item) => ({
      codigoEstudiante: item.info.username,
      carreraNombre: item.info.carrerName,
      facultadNombre: item.info.facultyName,
      creditosAprobados: item.totalCreditsApproved,
    }))

    const firstCareer = result.data[0].info

    return {
      dni: firstCareer.dni,
      nombres: firstCareer.name,
      apellidoPaterno: firstCareer.paternalSurname,
      apellidoMaterno: firstCareer.maternalSurname,
      email: firstCareer.email,
      emailPersonal: firstCareer.personalEmail,
      carreras,
    }
  } catch (error) {
    console.error('[External API] Error validando estudiante:', error)
    return null // No lanzar error, continuar con siguiente API
  }
}

/**
 * Validar docente contra API externa de UNAMAD
 */
export async function validateTeacherExternal(numeroDocumento: string): Promise<ExternalTeacherData | null> {
  try {
    const url = `${UNAMAD_TEACHER_API_URL}/${numeroDocumento}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${UNAMAD_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      console.log('[External API] Docente no encontrado:', response.status)
      return null
    }

    const result: TeacherAPIResult = await response.json()

    if (!result || !result.dni) {
      return null
    }

    return {
      dni: result.dni,
      codigoDocente: result.userName,
      nombres: result.name,
      apellidoPaterno: result.paternalSurname,
      apellidoMaterno: result.maternalSurname,
      email: result.email,
      emailPersonal: result.personalEmail,
      departamentoAcademico: result.academicDepartament,
      facultadNombre: result.facultyName,
    }
  } catch (error) {
    console.error('[External API] Error validando docente:', error)
    return null // No lanzar error, continuar con siguiente API
  }
}

/**
 * Validar persona contra API RENIEC (externos)
 */
export async function validateReniecExternal(numeroDocumento: string): Promise<ReniecAPIResult | null> {
  try {
    const url = `${UNAMAD_RENIEC_API_URL}/${numeroDocumento}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.log('[External API] RENIEC no encontrado:', response.status)
      return null
    }

    const result: ReniecAPIResult = await response.json()

    if (!result || !result.DNI) {
      return null
    }

    return result
  } catch (error) {
    console.error('[External API] Error validando RENIEC:', error)
    return null
  }
}

/**
 * Buscar usuario automáticamente en todas las APIs
 * Orden de búsqueda: Estudiante → Docente → RENIEC (Externo)
 * Retorna el tipo de usuario detectado y sus datos
 */
export async function autoDetectUserType(numeroDocumento: string): Promise<ExternalUserData | null> {
  console.log('[Auto Detect] Iniciando búsqueda para DNI:', numeroDocumento)

  // 1. Buscar como estudiante
  console.log('[Auto Detect] Buscando como estudiante...')
  const studentData = await validateStudentExternal(numeroDocumento)

  if (studentData) {
    console.log('[Auto Detect] ✓ Encontrado como ESTUDIANTE')
    return {
      tipoUsuario: 'ESTUDIANTE',
      dni: studentData.dni,
      nombres: studentData.nombres,
      apellidoPaterno: studentData.apellidoPaterno,
      apellidoMaterno: studentData.apellidoMaterno,
      email: studentData.email,
      emailPersonal: studentData.emailPersonal,
      facultad: studentData.carreras?.[0]?.facultadNombre || null,
      escuela: studentData.carreras?.[0]?.carreraNombre || null,
      codigoEstudiante: studentData.carreras?.[0]?.codigoEstudiante || null,
      codigoDocente: null,
      carreras: studentData.carreras,
    }
  }

  // 2. Buscar como docente
  console.log('[Auto Detect] Buscando como docente...')
  const teacherData = await validateTeacherExternal(numeroDocumento)

  if (teacherData) {
    console.log('[Auto Detect] ✓ Encontrado como DOCENTE')
    return {
      tipoUsuario: 'DOCENTE',
      dni: teacherData.dni,
      nombres: teacherData.nombres,
      apellidoPaterno: teacherData.apellidoPaterno,
      apellidoMaterno: teacherData.apellidoMaterno,
      email: teacherData.email,
      emailPersonal: teacherData.emailPersonal,
      facultad: teacherData.facultadNombre,
      escuela: teacherData.departamentoAcademico,
      codigoEstudiante: null,
      codigoDocente: teacherData.codigoDocente,
      carreras: undefined,
    }
  }

  // 3. Buscar en RENIEC (persona externa)
  console.log('[Auto Detect] Buscando en RENIEC...')
  const reniecData = await validateReniecExternal(numeroDocumento)

  if (reniecData) {
    console.log('[Auto Detect] ✓ Encontrado como EXTERNO (RENIEC)')
    return {
      tipoUsuario: 'EXTERNO',
      dni: reniecData.DNI,
      nombres: reniecData.NOMBRES,
      apellidoPaterno: reniecData.AP_PAT,
      apellidoMaterno: reniecData.AP_MAT,
      email: null, // Externos no tienen correo institucional
      emailPersonal: null,
      facultad: null,
      escuela: null,
      codigoEstudiante: null,
      codigoDocente: null,
      carreras: undefined,
    }
  }

  // No encontrado en ninguna API
  console.log('[Auto Detect] ✗ No encontrado en ninguna API')
  return null
}

/**
 * Validar usuario según su tipo (estudiante o docente) - Legacy
 */
export async function validateExternalUser(
  numeroDocumento: string,
  tipoUsuario: 'ESTUDIANTE' | 'DOCENTE'
): Promise<ExternalStudentData | ExternalTeacherData | null> {
  if (tipoUsuario === 'ESTUDIANTE') {
    return validateStudentExternal(numeroDocumento)
  } else if (tipoUsuario === 'DOCENTE') {
    return validateTeacherExternal(numeroDocumento)
  }
  return null
}

/**
 * Resultado de detección completa - puede tener múltiples roles
 */
export interface FullDetectionResult {
  // Datos personales (del primer resultado encontrado)
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string | null
  emailPersonal: string | null

  // Roles detectados
  detectedRoles: ('ESTUDIANTE' | 'DOCENTE' | 'EXTERNO')[]

  // Datos de estudiante (si aplica)
  studentData?: {
    carreras: {
      codigoEstudiante: string
      carreraNombre: string
      facultadNombre: string
      creditosAprobados: number
    }[]
  }

  // Datos de docente (si aplica)
  teacherData?: {
    codigoDocente: string
    departamentoAcademico: string
    facultadNombre: string
  }
}

/**
 * Buscar usuario en TODAS las APIs y retornar todos los roles detectados
 * Útil para casos donde un docente también es estudiante de otra carrera
 */
export async function fullUserDetection(numeroDocumento: string): Promise<FullDetectionResult | null> {
  console.log('[Full Detection] Iniciando búsqueda completa para DNI:', numeroDocumento)

  const detectedRoles: ('ESTUDIANTE' | 'DOCENTE' | 'EXTERNO')[] = []
  let baseData: Partial<FullDetectionResult> = {}
  let studentData: FullDetectionResult['studentData'] = undefined
  let teacherData: FullDetectionResult['teacherData'] = undefined

  // 1. Buscar como estudiante
  console.log('[Full Detection] Buscando como estudiante...')
  const studentResult = await validateStudentExternal(numeroDocumento)

  if (studentResult) {
    console.log('[Full Detection] ✓ Es ESTUDIANTE')
    detectedRoles.push('ESTUDIANTE')
    baseData = {
      dni: studentResult.dni,
      nombres: studentResult.nombres,
      apellidoPaterno: studentResult.apellidoPaterno,
      apellidoMaterno: studentResult.apellidoMaterno,
      email: studentResult.email,
      emailPersonal: studentResult.emailPersonal,
    }
    studentData = {
      carreras: studentResult.carreras || [],
    }
  }

  // 2. Buscar como docente (SIEMPRE, aunque sea estudiante)
  console.log('[Full Detection] Buscando como docente...')
  const teacherResult = await validateTeacherExternal(numeroDocumento)

  if (teacherResult) {
    console.log('[Full Detection] ✓ Es DOCENTE')
    detectedRoles.push('DOCENTE')
    // Si no teníamos datos base, usar los del docente
    if (!baseData.dni) {
      baseData = {
        dni: teacherResult.dni,
        nombres: teacherResult.nombres,
        apellidoPaterno: teacherResult.apellidoPaterno,
        apellidoMaterno: teacherResult.apellidoMaterno,
        email: teacherResult.email,
        emailPersonal: teacherResult.emailPersonal,
      }
    }
    teacherData = {
      codigoDocente: teacherResult.codigoDocente,
      departamentoAcademico: teacherResult.departamentoAcademico,
      facultadNombre: teacherResult.facultadNombre,
    }
  }

  // 3. Si no se encontró en ninguna, buscar en RENIEC
  if (detectedRoles.length === 0) {
    console.log('[Full Detection] Buscando en RENIEC...')
    const reniecResult = await validateReniecExternal(numeroDocumento)

    if (reniecResult) {
      console.log('[Full Detection] ✓ Es EXTERNO (RENIEC)')
      detectedRoles.push('EXTERNO')
      baseData = {
        dni: reniecResult.DNI,
        nombres: reniecResult.NOMBRES,
        apellidoPaterno: reniecResult.AP_PAT,
        apellidoMaterno: reniecResult.AP_MAT,
        email: null,
        emailPersonal: null,
      }
    }
  }

  // Si no se encontró en ninguna API
  if (detectedRoles.length === 0) {
    console.log('[Full Detection] ✗ No encontrado en ninguna API')
    return null
  }

  console.log('[Full Detection] Roles detectados:', detectedRoles)

  return {
    dni: baseData.dni!,
    nombres: baseData.nombres!,
    apellidoPaterno: baseData.apellidoPaterno!,
    apellidoMaterno: baseData.apellidoMaterno!,
    email: baseData.email || null,
    emailPersonal: baseData.emailPersonal || null,
    detectedRoles,
    studentData,
    teacherData,
  }
}
