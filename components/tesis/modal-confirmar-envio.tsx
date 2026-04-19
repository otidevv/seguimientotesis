'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Send, Pencil, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  thesisId: string
  tituloActual: string
  resumenActual: string | null
  /** Llamado cuando el usuario confirma y desea proceder con el envío. */
  onConfirmar: () => Promise<void>
}

/**
 * Modal de confirmación previa al envío a revisión:
 * muestra el título actual del proyecto y permite actualizarlo antes de enviar.
 * Evita que el tesista envíe un título viejo al haberlo cambiado el proyecto en el proceso.
 */
export function ModalConfirmarEnvio({
  open, onOpenChange, thesisId, tituloActual, resumenActual, onConfirmar,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(tituloActual)
  const [resumen, setResumen] = useState(resumenActual ?? '')
  const [guardando, setGuardando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset al cerrar o cambiar de tesis
  useEffect(() => {
    if (!open) {
      setEditando(false)
      setError(null)
    } else {
      setTitulo(tituloActual)
      setResumen(resumenActual ?? '')
    }
  }, [open, tituloActual, resumenActual])

  const tituloTrimmed = titulo.trim()
  const cambioTitulo = tituloTrimmed !== tituloActual.trim()
  const cambioResumen = (resumen.trim() || null) !== (resumenActual?.trim() || null)
  const huboCambios = cambioTitulo || cambioResumen
  const puedeConfirmar = !guardando && !enviando && tituloTrimmed.length >= 10

  async function guardarYEnviar() {
    setError(null)
    if (tituloTrimmed.length < 10) {
      setError('El título debe tener al menos 10 caracteres')
      return
    }
    setGuardando(true)
    try {
      if (huboCambios) {
        const res = await fetch(`/api/tesis/${thesisId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: tituloTrimmed,
            resumen: resumen.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al actualizar título')
        toast.success('Título actualizado')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar')
      setGuardando(false)
      return
    }

    setEnviando(true)
    try {
      await onConfirmar()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar')
    } finally {
      setGuardando(false)
      setEnviando(false)
    }
  }

  const procesando = guardando || enviando

  return (
    <Dialog open={open} onOpenChange={(v) => !procesando && onOpenChange(v)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" aria-hidden="true" />
            Confirmar envío a revisión
          </DialogTitle>
          <DialogDescription>
            Revisa el <strong>título</strong> y el <strong>resumen</strong> de tu proyecto antes de enviarlo a mesa de partes. Una vez enviado no podrás editarlos hasta recibir observaciones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!editando ? (
            // Vista de confirmación: título actual con opción a editar
            <>
              <div className="rounded-lg border-2 border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/20 p-4 space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-green-700 dark:text-green-300 mb-1">
                    Título del proyecto
                  </p>
                  <p className="text-sm font-medium leading-snug">{tituloActual}</p>
                </div>
                {resumenActual && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-green-700 dark:text-green-300 mb-1">
                      Resumen
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{resumenActual}</p>
                  </div>
                )}
              </div>

              <div className="rounded-md bg-muted/40 border p-3 flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  Si durante la elaboración del proyecto el título o enfoque ha cambiado,
                  puedes actualizarlo aquí antes de enviar. Esto evita que mesa de partes
                  reciba una versión desactualizada.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditando(true)}
                disabled={procesando}
                className="w-full"
              >
                <Pencil className="w-4 h-4 mr-2" aria-hidden="true" />
                Actualizar título o resumen antes de enviar
              </Button>
            </>
          ) : (
            // Vista de edición
            <>
              <div className="space-y-2">
                <Label htmlFor="conf-titulo">Título del proyecto</Label>
                <Input
                  id="conf-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  disabled={procesando}
                  placeholder="Ej. Desarrollo de un sistema de ..."
                />
                <p className={cn(
                  'text-xs',
                  tituloTrimmed.length < 10 ? 'text-red-600' : 'text-muted-foreground',
                )}>
                  {tituloTrimmed.length} caracteres · mínimo 10
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conf-resumen">Resumen (opcional)</Label>
                <Textarea
                  id="conf-resumen"
                  rows={4}
                  value={resumen}
                  onChange={(e) => setResumen(e.target.value)}
                  disabled={procesando}
                  placeholder="Breve descripción del proyecto..."
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditando(false)
                  setTitulo(tituloActual)
                  setResumen(resumenActual ?? '')
                }}
                disabled={procesando}
                className="w-full"
              >
                Cancelar edición y volver
              </Button>
            </>
          )}

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            onClick={guardarYEnviar}
            disabled={!puedeConfirmar}
            className="bg-green-600 hover:bg-green-700"
          >
            {procesando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            {huboCambios ? 'Guardar y enviar a revisión' : 'Continuar y enviar a revisión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
