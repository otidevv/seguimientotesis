'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import type { SystemConfigResponse } from '@/lib/admin/services/settings.service'

type GroupedSettings = Record<string, SystemConfigResponse[]>

export function useSettings() {
  const { authFetch } = useAuth()
  const [settings, setSettings] = useState<GroupedSettings>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authFetch('/api/admin/configuracion')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar configuración')
      }

      setSettings(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [authFetch])

  const saveSettings = useCallback(async (updates: { key: string; value: string }[]) => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await authFetch('/api/admin/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar configuración')
      }

      // Refrescar configuraciones
      await fetchSettings()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [authFetch, fetchSettings])

  return {
    settings,
    isLoading,
    isSaving,
    error,
    fetchSettings,
    saveSettings,
  }
}
