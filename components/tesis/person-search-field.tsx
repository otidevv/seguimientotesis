'use client'

import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PersonSearchFieldProps<T> {
  value: string
  onChange: (v: string) => void
  loading: boolean
  results: T[]
  onSelect: (item: T) => void
  renderResult: (item: T) => ReactNode
  itemKey: (item: T) => string
  placeholder?: string
  minQuery?: number
  emptyHint?: string
  /** Deshabilita el input — útil si falta un prerequisito (p.ej. carrera). */
  disabled?: boolean
  /** Permite marcar items individuales como no seleccionables. */
  isItemDisabled?: (item: T) => boolean
  /** Tooltip/indicador para items deshabilitados por isItemDisabled. */
  itemDisabledHint?: (item: T) => string
}

/**
 * Campo de búsqueda de personas con revelado suave, skeleton durante carga
 * inicial y preservación de resultados previos mientras se refetchea.
 *
 * Toda la lógica de fetch/debounce vive en el padre — este componente solo
 * presenta el estado. El parent pasa `value`, `loading` y `results`.
 */
export function PersonSearchField<T>({
  value,
  onChange,
  loading,
  results,
  onSelect,
  renderResult,
  itemKey,
  placeholder = 'Buscar…',
  minQuery = 2,
  emptyHint,
  disabled,
  isItemDisabled,
  itemDisabledHint,
}: PersonSearchFieldProps<T>) {
  const trimmed = value.trim()
  const hasQuery = trimmed.length >= minQuery
  const showResults = results.length > 0
  const showSkeleton = loading && results.length === 0
  const showEmpty = hasQuery && !loading && results.length === 0
  // Panel abierto mientras haya query válida: evita saltos al perder resultados
  // por refetch (los viejos quedan visibles dimgados hasta que lleguen los nuevos).
  const open = hasQuery

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={placeholder}
          className="pl-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-busy={loading}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Revelado suave con truco de CSS Grid: 0fr → 1fr transiciona height implícito. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'rounded-xl border bg-card',
              showResults && 'divide-y max-h-56 overflow-y-auto',
              (showSkeleton || showEmpty) && 'divide-y-0',
            )}
          >
            {showSkeleton && (
              <div className="p-3 space-y-2.5" aria-label="Buscando…">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
                      <div className="h-2.5 w-2/5 rounded bg-muted/70 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showResults && results.map((item) => {
              const itemDisabled = isItemDisabled?.(item) ?? false
              const hint = itemDisabled ? itemDisabledHint?.(item) : undefined
              return (
                <button
                  key={itemKey(item)}
                  type="button"
                  disabled={itemDisabled}
                  aria-disabled={itemDisabled}
                  title={hint}
                  onClick={() => onSelect(item)}
                  className={cn(
                    'w-full p-3 text-left flex items-center gap-3',
                    'transition-[background-color,opacity] duration-150',
                    // Si hay refetch con resultados previos, dimgamos mientras llegan los nuevos
                    loading && 'opacity-60',
                    itemDisabled
                      ? 'cursor-not-allowed opacity-50 bg-muted/30'
                      : 'cursor-pointer hover:bg-muted/60 focus:outline-none focus:bg-muted/80 focus:ring-2 focus:ring-primary/30',
                  )}
                >
                  {renderResult(item)}
                </button>
              )
            })}

            {showEmpty && (
              <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                <Search className="w-6 h-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Sin resultados para &ldquo;{trimmed}&rdquo;
                </p>
                {emptyHint && (
                  <p className="text-xs text-muted-foreground/70">{emptyHint}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
