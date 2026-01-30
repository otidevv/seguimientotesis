'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

// ============================================
// TIPOS
// ============================================

interface Role {
  id: string
  nombre: string
  codigo: string
  color: string | null
}

interface Permission {
  moduleCode: string
  moduleName: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

interface User {
  id: string
  tipoDocumento: string
  numeroDocumento: string
  username: string | null
  email: string
  emailPersonal: string | null
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  avatarUrl: string | null
  telefono: string | null
  isActive: boolean
  isVerified: boolean
  roles: Role[]
  permissions: Permission[]
}

interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

interface RegisterData {
  tipoDocumento: string
  numeroDocumento: string
  email: string
  password: string
  confirmPassword: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  emailPersonal?: string
}

interface AuthContextType {
  user: User | null
  permissions: Permission[]
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<{ message: string; requiresVerification: boolean }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  hasPermission: (moduleCode: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean
  hasRole: (roleCode: string) => boolean
  hasAnyRole: (roleCodes: string[]) => boolean
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

// ============================================
// EVENTO DE SESIÓN EXPIRADA
// ============================================

const SESSION_EXPIRED_EVENT = 'auth:session-expired'

export function dispatchSessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const isRefreshing = useRef(false)
  const sessionExpiredHandled = useRef(false)

  // Intentar refresh token
  const tryRefreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current) return false
    isRefreshing.current = true

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        isRefreshing.current = false
        return true
      }
    } catch {
      // Error al refrescar
    }

    isRefreshing.current = false
    return false
  }, [])

  // Manejar sesión expirada
  const handleSessionExpired = useCallback(() => {
    // Evitar múltiples llamadas
    if (sessionExpiredHandled.current) return
    sessionExpiredHandled.current = true

    // Solo limpiar el estado del frontend
    // El middleware se encarga de la redirección
    setUser(null)
    setPermissions([])
    setIsAuthenticated(false)

    console.log('[Auth] Sesión expirada, estado limpiado')

    // Reset después de un tiempo para permitir nuevo login
    setTimeout(() => {
      sessionExpiredHandled.current = false
    }, 2000)
  }, [])

  // Listener para evento de sesión expirada
  useEffect(() => {
    const handleExpiredEvent = () => {
      handleSessionExpired()
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiredEvent)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiredEvent)
    }
  }, [handleSessionExpired])

  // Fetch con manejo de autenticación
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    })

    // Si es 401, intentar refresh y reintentar
    if (response.status === 401) {
      const data = await response.clone().json().catch(() => ({}))

      if (data.code === 'TOKEN_INVALID' || data.code === 'UNAUTHORIZED') {
        // Intentar refresh token
        const refreshed = await tryRefreshToken()

        if (refreshed) {
          // Reintentar la petición original
          return fetch(url, {
            ...options,
            credentials: 'include',
          })
        } else {
          // No se pudo refrescar, sesión expirada
          handleSessionExpired()
        }
      }
    }

    return response
  }, [tryRefreshToken, handleSessionExpired])

  // Verificar autenticación al cargar con timeout
  const checkAuth = useCallback(async () => {
    // Timeout de 5 segundos para evitar que se quede colgado
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setPermissions(data.user.permissions || [])
        setIsAuthenticated(true)
      } else {
        // Usuario no autenticado (esperado, no es error)
        setUser(null)
        setPermissions([])
        setIsAuthenticated(false)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      // Error de red, timeout u otro - asumir no autenticado
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[Auth] Timeout verificando sesión, asumiendo no autenticado')
      }
      setUser(null)
      setPermissions([])
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Login
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión')
      }

      setUser(data.user)
      setPermissions(data.user.permissions || [])
      setIsAuthenticated(true)

      // Resetear flag de sesión expirada al hacer login exitoso
      sessionExpiredHandled.current = false

      // Redirigir al dashboard
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Register
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar usuario')
      }

      return {
        message: result.message,
        requiresVerification: result.requiresVerification,
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignorar errores
    } finally {
      setUser(null)
      setPermissions([])
      setIsAuthenticated(false)
      router.push('/login')
    }
  }, [router])

  // Verificar permiso
  const hasPermission = useCallback(
    (moduleCode: string, action: 'view' | 'create' | 'edit' | 'delete') => {
      const permission = permissions.find((p) => p.moduleCode === moduleCode)
      if (!permission) return false

      switch (action) {
        case 'view':
          return permission.canView
        case 'create':
          return permission.canCreate
        case 'edit':
          return permission.canEdit
        case 'delete':
          return permission.canDelete
        default:
          return false
      }
    },
    [permissions]
  )

  // Verificar rol
  const hasRole = useCallback(
    (roleCode: string) => {
      return user?.roles?.some((r) => r.codigo === roleCode) ?? false
    },
    [user]
  )

  // Verificar si tiene alguno de los roles
  const hasAnyRole = useCallback(
    (roleCodes: string[]) => {
      return roleCodes.some((code) => hasRole(code))
    },
    [hasRole]
  )

  const value: AuthContextType = {
    user,
    permissions,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    hasPermission,
    hasRole,
    hasAnyRole,
    authFetch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
