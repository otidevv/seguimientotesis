'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import { Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLORS = ['#8b5cf6','#f59e0b','#ef4444','#3b82f6','#14b8a6','#f97316','#6366f1','#0ea5e9','#ec4899','#6b7280']

interface Agregado { key: string; count: number }

interface Kpis {
  tiempoPromedioHoras: number
  tasaAprobacion: number
  pendientesTotal: number
  pendientesSlaExcedido: number
}

interface Props {
  total: number
  conCoautor: number
  sinCoautor: number
  porMotivo: Agregado[]
  porFacultad: Agregado[]
  porEstadoTesis: Agregado[]
  porMes?: Agregado[]
  kpis?: Kpis
}

const ESTADO_TESIS_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  OBSERVADA: 'Observada',
  ASIGNANDO_JURADOS: 'Asignando jurados',
  EN_EVALUACION_JURADO: 'Eval. jurado',
  OBSERVADA_JURADO: 'Obs. jurado',
  PROYECTO_APROBADO: 'Proy. aprobado',
}

function formatMesLabel(yyyyMM: string): string {
  const [anio, mes] = yyyyMM.split('-')
  const mesesEs = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const idx = Math.max(0, parseInt(mes, 10) - 1)
  return `${mesesEs[idx]} ${anio.slice(2)}`
}

function formatHoras(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 24) return `${h.toFixed(1)} h`
  const dias = h / 24
  return `${dias.toFixed(1)} d`
}

export function ReporteDesistimientosDashboard({
  total, conCoautor, sinCoautor, porMotivo, porFacultad, porEstadoTesis, porMes, kpis,
}: Props) {
  const motivoData = porMotivo.map(m => ({
    name: MOTIVO_LABEL[m.key as keyof typeof MOTIVO_LABEL] ?? m.key,
    value: m.count,
  }))
  const mesData = (porMes ?? []).map(m => ({ mes: formatMesLabel(m.key), total: m.count }))
  const estadoData = porEstadoTesis.map(e => ({
    estado: ESTADO_TESIS_LABEL[e.key] ?? e.key,
    total: e.count,
  }))

  return (
    <div className="space-y-6">
      {/* KPIs operativos */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={<Clock className="w-5 h-5" />}
            label="Tiempo promedio de resolución"
            value={kpis.tiempoPromedioHoras > 0 ? formatHoras(kpis.tiempoPromedioHoras) : '—'}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600"
          />
          <KpiCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Tasa de aprobación"
            value={`${kpis.tasaAprobacion}%`}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600"
          />
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Pendientes en trámite"
            value={String(kpis.pendientesTotal)}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600"
            highlight={kpis.pendientesTotal > 0}
          />
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Con más de 3 días sin resolver"
            value={String(kpis.pendientesSlaExcedido)}
            iconBg={kpis.pendientesSlaExcedido > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'}
            iconColor={kpis.pendientesSlaExcedido > 0 ? 'text-red-600' : 'text-muted-foreground'}
            highlight={kpis.pendientesSlaExcedido > 0}
            danger={kpis.pendientesSlaExcedido > 0}
          />
        </div>
      )}

      {/* Totales (filtrados) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total aprobados en el rango</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold tabular-nums">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Con coautor</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{conCoautor}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {total > 0 ? `${Math.round((conCoautor / total) * 100)}% del total` : 'Sin datos'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Autor único</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{sinCoautor}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {total > 0 ? `${Math.round((sinCoautor / total) * 100)}% del total` : 'Sin datos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tendencia temporal */}
      {mesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              Tendencia mensual
            </CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={mesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Por motivo</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={motivoData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {motivoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Por facultad</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={porFacultad.map(f => ({ facultad: f.key, total: f.count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="facultad" fontSize={11} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Por estado de tesis al desistir</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={estadoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="estado" fontSize={10} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  icon, label, value, iconBg, iconColor, highlight, danger,
}: {
  icon: React.ReactNode
  label: string
  value: string
  iconBg: string
  iconColor: string
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <Card className={cn(
      'transition-colors',
      danger && 'border-red-300 bg-red-50/50 dark:bg-red-950/10',
      highlight && !danger && 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10',
    )}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            <span className={iconColor}>{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            <p className="text-xl font-bold leading-tight tabular-nums mt-1">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
