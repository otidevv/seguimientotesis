import { ListaDesistimientos } from '@/components/desistimiento/lista-desistimientos'

export const metadata = { title: 'Solicitudes de desistimiento — Mesa de Partes' }

export default function DesistimientosPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes de desistimiento</h1>
          <p className="text-muted-foreground">Revisa y resuelve las solicitudes de los tesistas.</p>
        </div>
        <ListaDesistimientos />
      </div>
    </div>
  )
}
