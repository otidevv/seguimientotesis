import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET_VALUE = process.env.JWT_SECRET
if (process.env.NODE_ENV === 'production' && (!JWT_SECRET_VALUE || JWT_SECRET_VALUE === 'default-secret-key-change-in-production')) {
  throw new Error('[middleware] JWT_SECRET no está configurado en producción. Setéalo en .env antes de arrancar.')
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_VALUE || 'default-secret-key-change-in-production')

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
  '/api/auth/check-email', // Verificar si email existe (registro)
  '/api/auth/me', // Permitir verificar sesión sin token
  '/api/auth/logout', // Debe funcionar aunque la sesión esté caída
]

// Rutas protegidas por rol (páginas y APIs)
const PROTECTED_ROUTE_ROLES: Record<string, string[]> = {
  '/admin': ['SUPER_ADMIN', 'ADMIN'],
  '/api/admin': ['SUPER_ADMIN', 'ADMIN'],
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

function extractCookieValueFromSetCookie(
  setCookieHeaders: string[],
  cookieName: string
): string | null {
  const prefix = `${cookieName}=`
  for (const sc of setCookieHeaders) {
    if (sc.startsWith(prefix)) {
      const rest = sc.slice(prefix.length)
      const end = rest.indexOf(';')
      const raw = end === -1 ? rest : rest.slice(0, end)
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    }
  }
  return null
}

function rewriteCookieHeader(
  cookieHeader: string | null,
  updates: Record<string, string>
): string {
  const cookies = cookieHeader
    ? cookieHeader.split(';').map((s) => s.trim()).filter(Boolean)
    : []
  const seen = new Set<string>()
  const result: string[] = []

  for (const c of cookies) {
    const eqIdx = c.indexOf('=')
    if (eqIdx === -1) {
      result.push(c)
      continue
    }
    const name = c.slice(0, eqIdx)
    if (name in updates) {
      result.push(`${name}=${updates[name]}`)
      seen.add(name)
    } else {
      result.push(c)
    }
  }

  for (const [name, value] of Object.entries(updates)) {
    if (!seen.has(name)) {
      result.push(`${name}=${value}`)
    }
  }

  return result.join('; ')
}

type RefreshResult =
  | {
      status: 'success'
      payload: JwtPayload
      setCookieHeaders: string[]
      newAccessToken: string
      newRefreshToken: string | null
    }
  | { status: 'unauthorized' } // refresh token inválido/revocado/ausente
  | { status: 'transient_error' } // 5xx, timeout, red — no matar la sesión

const REFRESH_TIMEOUT_MS = 8000

async function attemptRefresh(request: NextRequest): Promise<RefreshResult> {
  const refreshCookie = request.cookies.get('refreshToken')?.value
  if (!refreshCookie) return { status: 'unauthorized' }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)

  try {
    const refreshUrl = new URL('/api/auth/refresh', request.url)
    const refreshResponse = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        cookie: `refreshToken=${refreshCookie}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    // 4xx → fallo permanente de autenticación (token inválido/revocado)
    if (refreshResponse.status >= 400 && refreshResponse.status < 500) {
      return { status: 'unauthorized' }
    }

    // 5xx u otra respuesta no-OK → error transitorio
    if (!refreshResponse.ok) {
      return { status: 'transient_error' }
    }

    const setCookieHeaders = typeof refreshResponse.headers.getSetCookie === 'function'
      ? refreshResponse.headers.getSetCookie()
      : []

    const newAccessToken = extractCookieValueFromSetCookie(setCookieHeaders, 'accessToken')
    if (!newAccessToken) return { status: 'transient_error' }

    const payload = await verifyToken(newAccessToken)
    if (!payload) return { status: 'transient_error' }

    const newRefreshToken = extractCookieValueFromSetCookie(setCookieHeaders, 'refreshToken')

    return {
      status: 'success',
      payload,
      setCookieHeaders,
      newAccessToken,
      newRefreshToken,
    }
  } catch {
    clearTimeout(timeoutId)
    // AbortError, red caída, DNS, etc. — todos transitorios
    return { status: 'transient_error' }
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

  // Endpoints de cron: autenticados por Bearer CRON_SECRET en el handler,
  // no por JWT de usuario.
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next()
  }

  // Obtener token del header o cookie
  const authHeader = request.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    token = request.cookies.get('accessToken')?.value || null
  }

  let payload: JwtPayload | null = null
  let refreshedCookies: string[] = []
  let rewrittenCookieHeader: string | null = null
  let refreshResult: RefreshResult = { status: 'unauthorized' }

  if (token) {
    payload = await verifyToken(token)
  }

  // Si no hay access token válido, intentar auto-refresh con el refresh cookie
  if (!payload) {
    refreshResult = await attemptRefresh(request)
    if (refreshResult.status === 'success') {
      payload = refreshResult.payload
      refreshedCookies = refreshResult.setCookieHeaders

      // Reescribir el header `cookie` del request para que los handlers
      // downstream (que re-verifican el token desde la cookie) vean los
      // tokens nuevos, no los viejos/expirados.
      const updates: Record<string, string> = {
        accessToken: refreshResult.newAccessToken,
      }
      if (refreshResult.newRefreshToken) {
        updates.refreshToken = refreshResult.newRefreshToken
      }
      rewrittenCookieHeader = rewriteCookieHeader(
        request.headers.get('cookie'),
        updates
      )
    }
  }

  if (!payload) {
    const isTransient = refreshResult.status === 'transient_error'
    const hadAnyAuth = !!token || !!request.cookies.get('refreshToken')?.value

    if (pathname.startsWith('/api/')) {
      if (isTransient) {
        // NO borrar cookies: la sesión puede recuperarse cuando el backend vuelva.
        return NextResponse.json(
          {
            error: 'Servicio de autenticación temporalmente no disponible',
            code: 'AUTH_TEMPORARILY_UNAVAILABLE',
          },
          { status: 503 }
        )
      }

      return NextResponse.json(
        {
          error: hadAnyAuth ? 'Token inválido o expirado' : 'No autorizado',
          code: hadAnyAuth ? 'TOKEN_INVALID' : 'UNAUTHORIZED',
        },
        { status: 401 }
      )
    }

    // Página con error transitorio: redirigir al login con flag de reintento,
    // PERO sin borrar cookies — así el próximo request puede resolverse solo.
    if (isTransient) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', pathname)
      url.searchParams.set('retry', 'true')
      return NextResponse.redirect(url)
    }

    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    if (hadAnyAuth) {
      url.searchParams.set('expired', 'true')
    }
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

  // Si hubo auto-refresh, reescribir la cookie del request para que los
  // handlers downstream vean los tokens nuevos al hacer request.cookies.get().
  if (rewrittenCookieHeader !== null) {
    requestHeaders.set('cookie', rewrittenCookieHeader)
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Propagar cookies renovadas al cliente si hubo auto-refresh
  for (const sc of refreshedCookies) {
    response.headers.append('set-cookie', sc)
  }

  return response
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
