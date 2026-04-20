import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'

export interface TesisReporteData {
  numero: number
  tesista1: string
  tesista2: string
  carrera: string
  titulo: string
  asesor: string
  coasesor: string
  fechaPresentacion: Date | null
  nroExpediente: string
  resolucionJurado: string
  fechaResolucionJurado: Date | null
  juradosRevisores: string
  observacion: string
  resolucionAprobacion: string
  fechaPresentacionInforme: Date | null
  nroExpedienteInforme: string
  resolucionJuradoInforme: string
  resolucionSustentacion: string
  /** Estado actual de la tesis (sólo usado para la vista previa JSON). */
  estado?: string
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export async function generarReporteExcel(
  datos: TesisReporteData[],
  facultad: string,
  anio: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistema de Tesis UNAMAD'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('REGISTRO TESIS', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  // ============================
  // ENCABEZADO
  // ============================

  // Logo UNAMAD
  const logoPath = path.join(process.cwd(), 'public', 'logo', 'logounamad.png')
  if (fs.existsSync(logoPath)) {
    const logoId = workbook.addImage({
      filename: logoPath,
      extension: 'png',
    })
    sheet.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 80, height: 80 },
    })
  }

  // Fila 1: Universidad
  sheet.mergeCells('C1:P1')
  const cellUniversidad = sheet.getCell('C1')
  cellUniversidad.value = 'UNIVERSIDAD NACIONAL AMAZONICA DE MADRE DE DIOS'
  cellUniversidad.font = { bold: true, size: 14 }
  cellUniversidad.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 25

  // Fila 2: Titulo del reporte
  sheet.mergeCells('C2:P2')
  const cellTitulo = sheet.getCell('C2')
  cellTitulo.value = 'REGISTRO DE PRESENTACION DE PROYECTOS DE TESIS'
  cellTitulo.font = { bold: true, size: 12 }
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(2).height = 22

  // Fila 3: Facultad y Año
  sheet.mergeCells('C3:P3')
  const cellFacultad = sheet.getCell('C3')
  cellFacultad.value = `${facultad} - ${anio}`
  cellFacultad.font = { bold: true, size: 11 }
  cellFacultad.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(3).height = 22

  // Fila vacía
  sheet.getRow(4).height = 10

  // ============================
  // CABECERAS DE GRUPO (Fila 5)
  // ============================
  const headerGroupRow = 5
  const headerDetailRow = 6

  // Colores
  const proyectoColor: Partial<ExcelJS.Fill> = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' },
  }
  const informeColor: Partial<ExcelJS.Fill> = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E75B6' },
  }
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    size: 9,
    color: { argb: 'FFFFFFFF' },
  }
  const headerAlignment: Partial<ExcelJS.Alignment> = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  }

  // Grupo "PROYECTO DE TESIS" (columnas A-N)
  sheet.mergeCells(headerGroupRow, 1, headerGroupRow, 14)
  const cellProyecto = sheet.getCell(headerGroupRow, 1)
  cellProyecto.value = 'PROYECTO DE TESIS'
  cellProyecto.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  cellProyecto.alignment = { horizontal: 'center', vertical: 'middle' }
  cellProyecto.fill = proyectoColor as ExcelJS.Fill
  for (let col = 1; col <= 14; col++) {
    sheet.getCell(headerGroupRow, col).fill = proyectoColor as ExcelJS.Fill
  }

  // Grupo "INFORME FINAL" (columnas O-R)
  sheet.mergeCells(headerGroupRow, 15, headerGroupRow, 18)
  const cellInforme = sheet.getCell(headerGroupRow, 15)
  cellInforme.value = 'INFORME FINAL'
  cellInforme.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  cellInforme.alignment = { horizontal: 'center', vertical: 'middle' }
  cellInforme.fill = informeColor as ExcelJS.Fill
  for (let col = 15; col <= 18; col++) {
    sheet.getCell(headerGroupRow, col).fill = informeColor as ExcelJS.Fill
  }

  sheet.getRow(headerGroupRow).height = 25

  // ============================
  // CABECERAS DE COLUMNA (Fila 6)
  // ============================
  const columns = [
    { header: 'N°', width: 5 },
    { header: 'TESISTA 1', width: 28 },
    { header: 'TESISTA 2', width: 28 },
    { header: 'CARRERA PRO.', width: 18 },
    { header: 'NOMBRE DE TESIS', width: 40 },
    { header: 'ASESOR', width: 25 },
    { header: 'CO-ASESOR', width: 25 },
    { header: 'FECHA DE PRESENTACION', width: 16 },
    { header: 'NRO DE EXPEDIENTE', width: 15 },
    { header: 'RESOLUCION CONFORMACION JURADO', width: 20 },
    { header: 'FECHA', width: 14 },
    { header: 'NOMBRE DEL JURADO REVISOR', width: 35 },
    { header: 'OBSERVACION', width: 25 },
    { header: 'RESOLUCION APROBACION PROYECTO', width: 20 },
    { header: 'FECHA PRESENTACION', width: 16 },
    { header: 'NRO EXPEDIENTE', width: 15 },
    { header: 'RESOLUCION JURADO INFORME FINAL', width: 20 },
    { header: 'RESOLUCION SUSTENTACION', width: 20 },
  ]

  // Establecer anchos de columna
  columns.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width
  })

  // Escribir cabeceras detalladas
  const detailHeaderFillProyecto: Partial<ExcelJS.Fill> = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E75B6' },
  }
  const detailHeaderFillInforme: Partial<ExcelJS.Fill> = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF5B9BD5' },
  }

  columns.forEach((col, idx) => {
    const cell = sheet.getCell(headerDetailRow, idx + 1)
    cell.value = col.header
    cell.font = headerFont
    cell.alignment = headerAlignment
    cell.fill = (idx < 14 ? detailHeaderFillProyecto : detailHeaderFillInforme) as ExcelJS.Fill
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    }
  })

  sheet.getRow(headerDetailRow).height = 40

  // ============================
  // DATOS (Fila 7 en adelante)
  // ============================
  const dataFont: Partial<ExcelJS.Font> = { size: 9 }
  const dataAlignment: Partial<ExcelJS.Alignment> = {
    vertical: 'middle',
    wrapText: true,
  }
  const dataBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  }

  const startRow = 7
  datos.forEach((item, idx) => {
    const rowNum = startRow + idx
    const rowData = [
      item.numero,
      item.tesista1,
      item.tesista2,
      item.carrera,
      item.titulo,
      item.asesor,
      item.coasesor,
      formatDate(item.fechaPresentacion),
      item.nroExpediente,
      item.resolucionJurado,
      formatDate(item.fechaResolucionJurado),
      item.juradosRevisores,
      item.observacion,
      item.resolucionAprobacion,
      formatDate(item.fechaPresentacionInforme),
      item.nroExpedienteInforme,
      item.resolucionJuradoInforme,
      item.resolucionSustentacion,
    ]

    rowData.forEach((value, colIdx) => {
      const cell = sheet.getCell(rowNum, colIdx + 1)
      cell.value = value
      cell.font = dataFont
      cell.alignment = colIdx === 0
        ? { ...dataAlignment, horizontal: 'center' }
        : dataAlignment
      cell.border = dataBorder as ExcelJS.Borders
    })

    // Alternar color de fondo
    if (idx % 2 === 1) {
      for (let col = 1; col <= 18; col++) {
        sheet.getCell(rowNum, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F7FB' },
        }
      }
    }

    sheet.getRow(rowNum).height = 30
  })

  // Si no hay datos, agregar fila indicativa
  if (datos.length === 0) {
    sheet.mergeCells(startRow, 1, startRow, 18)
    const emptyCell = sheet.getCell(startRow, 1)
    emptyCell.value = 'No se encontraron registros para los filtros seleccionados'
    emptyCell.font = { size: 10, italic: true, color: { argb: 'FF888888' } }
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' }
    sheet.getRow(startRow).height = 30
  }

  // ============================
  // PIE DE REPORTE
  // ============================
  const footerRow = startRow + Math.max(datos.length, 1) + 1
  sheet.mergeCells(footerRow, 1, footerRow, 18)
  const footerCell = sheet.getCell(footerRow, 1)
  footerCell.value = `Reporte generado el ${formatDate(new Date())} - Total de registros: ${datos.length}`
  footerCell.font = { size: 8, italic: true, color: { argb: 'FF666666' } }
  footerCell.alignment = { horizontal: 'right' }

  // Generar buffer
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
