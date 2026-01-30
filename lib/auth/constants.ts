// ============================================
// CONSTANTES DE AUTENTICACION
// ============================================

// Duracion de tokens
export const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m'
export const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d'
export const REFRESH_TOKEN_REMEMBER_EXPIRES = process.env.JWT_REFRESH_REMEMBER_EXPIRES || '30d'

// Seguridad
export const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)
export const MAX_LOGIN_ATTEMPTS = 5
export const LOCK_TIME_MINUTES = 15

// Rate limiting
export const RATE_LIMIT_LOGIN = {
  maxAttempts: 5,
  windowMinutes: 15,
}

export const RATE_LIMIT_REGISTER = {
  maxAttempts: 3,
  windowMinutes: 60,
}

export const RATE_LIMIT_PASSWORD_RESET = {
  maxAttempts: 3,
  windowMinutes: 60,
}

// URLs de APIs externas
export const UNAMAD_STUDENT_API_URL = process.env.EXTERNAL_API_URL || 'https://daa-documentos.unamad.edu.pe:8081/api/data/student'
export const UNAMAD_TEACHER_API_URL = process.env.EXTERNAL_TEACHER_API_URL || 'https://daa-documentos.unamad.edu.pe:8081/api/data/teacher'
export const UNAMAD_RENIEC_API_URL = process.env.EXTERNAL_RENIEC_API_URL || 'https://apidatos.unamad.edu.pe/api/consulta'
export const UNAMAD_API_TOKEN = process.env.EXTERNAL_API_TOKEN || ''

// Cookies
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export const ACCESS_TOKEN_COOKIE = 'accessToken'
export const REFRESH_TOKEN_COOKIE = 'refreshToken'

// Rutas publicas (sin autenticacion)
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/registrarse',
  '/verificar-email',
  '/recuperar-password',
  '/restablecer-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/validate-user',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
]

// Rutas protegidas por rol
export const PROTECTED_ROUTE_ROLES: Record<string, string[]> = {
  '/admin': ['SUPER_ADMIN', 'ADMIN'],
  '/admin/usuarios': ['SUPER_ADMIN', 'ADMIN'],
  '/admin/roles': ['SUPER_ADMIN'],
  '/admin/permisos': ['SUPER_ADMIN'],
  '/admin/auditoria': ['SUPER_ADMIN', 'ADMIN'],
}
