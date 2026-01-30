'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

interface UserPaginationProps {
  page: number
  limit: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export function UserPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: UserPaginationProps) {
  // Calcular rango de registros mostrados
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1
  const endRecord = Math.min(page * limit, total)

  // Generar números de página a mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Mostrar todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Siempre mostrar primera página
      pages.push(1)

      if (page > 3) {
        pages.push('...')
      }

      // Páginas alrededor de la actual
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (page < totalPages - 2) {
        pages.push('...')
      }

      // Siempre mostrar última página
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (total === 0) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
      {/* Info de registros */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Mostrando <strong>{startRecord}</strong> - <strong>{endRecord}</strong> de{' '}
          <strong>{total}</strong> usuarios
        </span>

        {/* Selector de cantidad por página */}
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <Select
            value={limit.toString()}
            onValueChange={(value) => onLimitChange(parseInt(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Controles de navegación */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Ir a primera página */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Página anterior */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Números de página */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) =>
              pageNum === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(pageNum as number)}
                >
                  {pageNum}
                </Button>
              )
            )}
          </div>

          {/* Indicador de página para móvil */}
          <span className="sm:hidden px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>

          {/* Página siguiente */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Ir a última página */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
