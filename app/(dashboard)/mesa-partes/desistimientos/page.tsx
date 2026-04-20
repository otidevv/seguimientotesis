import Link from 'next/link'
import { ChevronRight, Ban } from 'lucide-react'
import { ListaDesistimientos } from '@/components/desistimiento/lista-desistimientos'

export const metadata = { title: 'Solicitudes de desistimiento — Mesa de Partes' }

export default function DesistimientosPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/mesa-partes" className="hover:text-foreground transition-colors">
          Mesa de Partes
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Desistimientos</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Ban className="w-6 h-6 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Solicitudes de desistimiento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revisa y resuelve las solicitudes de los tesistas que piden desistir de su proyecto.
          </p>
        </div>
      </div>

      <ListaDesistimientos />
    </div>
  )
}
