'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { BarChart3, Inbox } from 'lucide-react'

const chartConfig = {
  registradas: { label: 'Nuevas', color: 'var(--color-primary)' },
  actualizadas: { label: 'Con actividad', color: '#10b981' },
}

interface ActivityChartProps {
  data: { month: string; registradas: number; actualizadas: number }[]
}

export function ActivityChart({ data }: ActivityChartProps) {
  const hasData = data.some((m) => m.registradas > 0 || m.actualizadas > 0)

  return (
    <Card className="md:col-span-4 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-backwards" style={{ animationDelay: '320ms', animationDuration: '500ms' }} aria-label="Gráfico de actividad de tesis de los últimos 6 meses">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">Actividad de Tesis</CardTitle>
            <CardDescription className="text-xs">Últimos 6 meses</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="registradas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actualizadas" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[200px] sm:h-[280px] flex flex-col items-center justify-center text-muted-foreground">
            <Inbox className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Sin datos en los últimos 6 meses</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
