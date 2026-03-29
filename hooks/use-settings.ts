'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { SystemConfigResponse } from '@/lib/admin/services/settings.service'

type GroupedSettings = Record<string, SystemConfigResponse[]>

export function useSettings() {
  const [settings, setSettings] = useState<GroupedSettings>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.get<{ data: GroupedSettings }>('/api/admin/configuracion')
      setSettings(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveSettings = useCallback(async (updates: { key: string; value: string }[]) => {
    setIsSaving(true)
    setError(null)

    try {
      await api.put('/api/admin/configuracion', { updates })
      await fetchSettings()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [fetchSettings])

  return {
    settings,
    isLoading,
    isSaving,
    error,
    fetchSettings,
    saveSettings,
  }
}
