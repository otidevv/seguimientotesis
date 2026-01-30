'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Filter } from 'lucide-react'

interface UserFiltersProps {
  onFilter: (filters: UserFilterValues) => void
  roles: { id: string; nombre: string }[]
}

interface UserFilterValues {
  search?: string
  isActive?: string
  roleId?: string
}

export function UserFilters({ onFilter, roles }: UserFiltersProps) {
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<string>('')
  const [roleId, setRoleId] = useState<string>('')

  const handleFilter = () => {
    onFilter({
      search: search || undefined,
      isActive: isActive || undefined,
      roleId: roleId || undefined,
    })
  }

  const handleClear = () => {
    setSearch('')
    setIsActive('')
    setRoleId('')
    onFilter({})
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFilter()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/50 rounded-lg">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={isActive} onValueChange={(v) => { setIsActive(v); }}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Activo</SelectItem>
          <SelectItem value="false">Inactivo</SelectItem>
        </SelectContent>
      </Select>

      <Select value={roleId} onValueChange={(v) => { setRoleId(v); }}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Rol" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {role.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button onClick={handleFilter} variant="secondary">
          <Filter className="h-4 w-4 mr-2" />
          Filtrar
        </Button>
        <Button onClick={handleClear} variant="ghost" size="icon">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
