import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-in-production')

// Rutas públicas (sin autenticación)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/registrarse',
  '/verificar-email',
  '/recuperar-password',
  '/restablecer-password',
]

const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/validate-user',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/me', // Permitir verificar sesión sin token
]

// Rutas protegidas por rol
const PROTECTED_ROUTE_ROLES: Record<string, string[]> = {
  '/admin': ['SUPER_ADMIN', 'ADMIN'],
  '/admin/usuarios': ['SUPER_ADMIN', 'ADMIN'],
  '/admin/roles': ['SUPER_ADMIN'],
  '/admin/permisos': ['SUPER_ADMIN'],
  '/admin/auditoria': ['SUPER_ADMIN', 'ADMIN'],
}

interface JwtPayload {
  userId: string
  email: string
  tipoUsuario: string
  roles: string[]
}

async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar archivos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // archivos con extensión
  ) {
    return NextResponse.next()
  }

  // Permitir rutas públicas
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))

  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next()
  }

  // Permitir API de firma-peru (mantener compatibilidad)
  if (pathname.startsWith('/api/firma-peru')) {
    return NextResponse.next()
  }

  // Obtener token del header o cookie
  const authHeader = request.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    token = request.cookies.get('accessToken')?.value || null
  }

  // Si no hay token
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    // Redirigir a login para páginas
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Verificar token
  const payload = await verifyToken(token)

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token inválido o expirado', code: 'TOKEN_INVALID' },
        { status: 401 }
      )
    }
    // Limpiar cookies y redirigir a login con indicador de sesión expirada
    const url = new URL('/login', request.url)
    url.searchParams.set('expired', 'true')
    url.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(url)
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')
    return response
  }

  // Verificar roles para rutas protegidas
  const requiredRoles = Object.entries(PROTECTED_ROUTE_ROLES).find(
    ([route]) => pathname.startsWith(route)
  )?.[1]

  if (requiredRoles) {
    const userRoles = payload.roles || []
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role))

    if (!hasRequiredRole) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Acceso denegado', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }
      // Redirigir a dashboard si no tiene permisos
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Agregar información del usuario a los headers para las API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-tipo', payload.tipoUsuario)
  requestHeaders.set('x-user-roles', JSON.stringify(payload.roles))

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
