'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'

const COLORS = ['#8b5cf6','#f59e0b','#ef4444','#3b82f6','#14b8a6','#f97316','#6366f1','#0ea5e9','#ec4899','#6b7280']

interface Agregado { key: string; count: number }

interface Props {
  total: number; conCoautor: number; sinCoautor: number;
  porMotivo: Agregado[]; porFacultad: Agregado[]; porEstadoTesis: Agregado[];
}

export function ReporteDesistimientosDashboard({ total, conCoautor, sinCoautor, porMotivo, porFacultad, porEstadoTesis }: Props) {
  const motivoData = porMotivo.map(m => ({ name: MOTIVO_LABEL[m.key as keyof typeof MOTIVO_LABEL] ?? m.key, value: m.count }))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Con coautor</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{conCoautor}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Autor único</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{sinCoautor}</CardContent></Card>
      </div>

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
                <YAxis />
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
            <BarChart data={porEstadoTesis.map(e => ({ estado: e.key, total: e.count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="estado" fontSize={10} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
