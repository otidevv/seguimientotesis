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

interface AuditFiltersProps {
  onFilter: (filters: AuditFilterValues) => void
  actions: string[]
  entityTypes: string[]
}

export interface AuditFilterValues {
  search?: string
  action?: string
  entityType?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export function AuditFilters({ onFilter, actions, entityTypes }: AuditFiltersProps) {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string>('')
  const [entityType, setEntityType] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const handleFilter = () => {
    onFilter({
      search: search || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
  }

  const handleClear = () => {
    setSearch('')
    setAction('')
    setEntityType('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
    onFilter({})
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFilter()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción, acción o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={action} onValueChange={(v) => { setAction(v); }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityType} onValueChange={(v) => { setEntityType(v); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => { setStatus(v); }}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SUCCESS">Exitoso</SelectItem>
            <SelectItem value="FAILURE">Fallido</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex gap-2 flex-1">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

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
    </div>
  )
}
