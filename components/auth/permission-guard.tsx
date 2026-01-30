'use client'

import { useAuth } from '@/contexts/auth-context'
import type { ReactNode } from 'react'

interface PermissionGuardProps {
  moduleCode: string
  action: 'view' | 'create' | 'edit' | 'delete'
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Componente que muestra u oculta contenido basado en permisos de módulo
 */
export function PermissionGuard({
  moduleCode,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!hasPermission(moduleCode, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RoleGuardProps {
  roles: string[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean
}

/**
 * Componente que muestra u oculta contenido basado en roles
 */
export function RoleGuard({
  roles,
  children,
  fallback = null,
  requireAll = false,
}: RoleGuardProps) {
  const { hasRole, hasAnyRole, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  const hasAccess = requireAll
    ? roles.every((role) => hasRole(role))
    : hasAnyRole(roles)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Componente que muestra contenido solo si el usuario está autenticado
 */
export function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Componente que muestra contenido solo si el usuario NO está autenticado
 */
export function GuestGuard({ children, fallback = null }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (isAuthenticated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
