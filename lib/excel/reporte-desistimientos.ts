import ExcelJS from 'exceljs'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import type { MotivoDesistimiento, EstadoTesis } from '@prisma/client'

export interface DesistimientoRow {
  solicitadoAt: Date
  aprobadoAt: Date | null
  estudiante: string
  codigo: string
  documento: string
  carrera: string
  facultad: string
  tituloTesis: string
  motivoCategoria: MotivoDesistimiento
  motivoDescripcion: string
  estadoTesisAlSolicitar: EstadoTesis
  faseActual: string | null
  teniaCoautor: boolean
}

function fmt(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
}

export async function generarExcelDesistimientos(rows: DesistimientoRow[], titulo: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sistema de Tesis UNAMAD'
  wb.created = new Date()
  const ws = wb.addWorksheet('Desistimientos', { pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true } })

  ws.mergeCells('A1:M1')
  ws.getCell('A1').value = titulo
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  const headers = [
    'Fecha solicitud','Fecha aprobación','Estudiante','Código','DNI','Carrera','Facultad',
    'Título tesis','Motivo','Descripción','Estado tesis al solicitar','Fase','Tenía coautor',
  ]
  ws.addRow([])
  const headerRow = ws.addRow(headers)
  headerRow.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })

  rows.forEach(r => {
    ws.addRow([
      fmt(r.solicitadoAt), fmt(r.aprobadoAt), r.estudiante, r.codigo, r.documento, r.carrera, r.facultad,
      r.tituloTesis, MOTIVO_LABEL[r.motivoCategoria] ?? r.motivoCategoria, r.motivoDescripcion,
      r.estadoTesisAlSolicitar, r.faseActual ?? '', r.teniaCoautor ? 'Sí' : 'No',
    ])
  })

  ws.columns.forEach(col => { col.width = 22 })
  ws.getColumn(10).width = 50

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
