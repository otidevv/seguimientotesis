'use client'

import { useState } from 'react'
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

interface ModuleFiltersProps {
  onFilter: (filters: {
    search?: string
    isActive?: string
  }) => void
}

export function ModuleFilters({ onFilter }: ModuleFiltersProps) {
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<string>('')

  const handleSearch = () => {
    onFilter({
      search: search || undefined,
      isActive: isActive || undefined,
    })
  }

  const handleClear = () => {
    setSearch('')
    setIsActive('')
    onFilter({})
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9"
        />
      </div>

      <Select value={isActive} onValueChange={setIsActive}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="true">Activos</SelectItem>
          <SelectItem value="false">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button onClick={handleSearch} className="flex-1 sm:flex-none">
          <Search className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Buscar</span>
        </Button>
        <Button variant="outline" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
