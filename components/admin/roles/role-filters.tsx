'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface RoleFiltersProps {
  onFilter: (filters: {
    search?: string
    isActive?: string
    isSystem?: string
  }) => void
}

export function RoleFilters({ onFilter }: RoleFiltersProps) {
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<string>('')
  const [isSystem, setIsSystem] = useState<string>('')

  const applyFilters = useCallback(() => {
    onFilter({
      search: search || undefined,
      isActive: isActive || undefined,
      isSystem: isSystem || undefined,
    })
  }, [search, isActive, isSystem, onFilter])

  // Aplicar filtros con debounce para busqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters()
    }, 300)

    return () => clearTimeout(timer)
  }, [search, applyFilters])

  // Aplicar filtros inmediatamente para selects
  useEffect(() => {
    applyFilters()
  }, [isActive, isSystem])

  const clearFilters = () => {
    setSearch('')
    setIsActive('')
    setIsSystem('')
    onFilter({})
  }

  const hasFilters = search || isActive || isSystem

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Busqueda */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o codigo..."
          className="pl-9"
        />
      </div>

      {/* Filtro Estado */}
      <Select value={isActive} onValueChange={setIsActive}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Activos</SelectItem>
          <SelectItem value="false">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro Tipo */}
      <Select value={isSystem} onValueChange={setIsSystem}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Sistema</SelectItem>
          <SelectItem value="false">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Limpiar filtros */}
      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
