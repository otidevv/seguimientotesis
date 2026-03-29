'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartTooltip } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { GraduationCap, Inbox } from 'lucide-react'

interface FacultyChartProps {
  data: { name: string; value: number; color: string }[]
}

export function FacultyChart({ data }: FacultyChartProps) {
  const total = data.reduce((sum, f) => sum + f.value, 0)

  return (
    <Card className="md:col-span-3 overflow-hidden animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ animationDelay: '400ms', animationDuration: '500ms' }}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">Tesis por Facultad</CardTitle>
            <CardDescription className="text-xs">Distribución actual</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        {data.length > 0 ? (
          <>
            <div className="h-[180px] sm:h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  {/* Center label */}
                  <text x="50%" y="48%" textAnchor="middle" className="fill-foreground text-2xl font-bold">
                    {total}
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" className="fill-muted-foreground text-[11px]">
                    total
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 mt-3">
              {data.map((item) => (
                <div key={item.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs sm:text-sm truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs sm:text-sm font-semibold tabular-nums">{item.value}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                      {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
            <Inbox className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Sin datos de facultades</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
