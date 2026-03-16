'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Save, Loader2 } from 'lucide-react'
import type { SystemConfigResponse } from '@/lib/admin/services/settings.service'

interface SettingsCategoryProps {
  title: string
  description: string
  icon: React.ReactNode
  settings: SystemConfigResponse[]
  onSave: (updates: { key: string; value: string }[]) => Promise<boolean>
  isSaving: boolean
}

export function SettingsCategory({
  title,
  description,
  icon,
  settings,
  onSave,
  isSaving,
}: SettingsCategoryProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const initial: Record<string, string> = {}
    for (const s of settings) {
      initial[s.key] = s.value
    }
    setValues(initial)
    setHasChanges(false)
  }, [settings])

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleToggle = (key: string, checked: boolean) => {
    setValues((prev) => ({ ...prev, [key]: String(checked) }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    const updates = settings
      .filter((s) => values[s.key] !== s.value)
      .map((s) => ({ key: s.key, value: values[s.key] }))

    if (updates.length === 0) return

    const success = await onSave(updates)
    if (success) {
      setHasChanges(false)
    }
  }

  if (settings.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <Label htmlFor={setting.key} className="font-medium text-sm">
                {setting.label}
              </Label>
              {setting.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
              )}
            </div>
            <div className="sm:w-[280px] flex-shrink-0">
              {setting.type === 'boolean' ? (
                <Switch
                  id={setting.key}
                  checked={values[setting.key] === 'true'}
                  onCheckedChange={(checked) => handleToggle(setting.key, checked)}
                />
              ) : setting.type === 'number' ? (
                <Input
                  id={setting.key}
                  type="number"
                  value={values[setting.key] || ''}
                  onChange={(e) => handleChange(setting.key, e.target.value)}
                />
              ) : (
                <Input
                  id={setting.key}
                  type="text"
                  value={values[setting.key] || ''}
                  onChange={(e) => handleChange(setting.key, e.target.value)}
                />
              )}
            </div>
          </div>
        ))}
        {settings.length > 0 && settings[0].updatedBy && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Última actualización: {new Date(settings[0].updatedAt).toLocaleString('es-PE')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
