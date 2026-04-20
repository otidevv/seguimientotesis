/**
 * Servicio para generar el acta de desistimiento en PDF.
 */

import PDFDocument from 'pdfkit'

export interface ActaDesistimientoData {
  desistimiento: {
    id: string
    solicitadoAt: Date
    aprobadoAt: Date | null
    aprobadoPor: string | null
    motivoCategoriaLabel: string
    motivoDescripcion: string
    estadoTesisAlSolicitar: string
    teniaCoautor: boolean
  }
  estudiante: {
    nombreCompleto: string
    documento: string
    codigoEstudiante: string | null
    carrera: string
    facultad: string
  }
  tesis: {
    titulo: string
    codigo: string
  }
  coautorContinua?: {
    nombreCompleto: string
    codigoEstudiante: string | null
  } | null
}

function fmtFecha(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima',
  })
}

function fmtFechaHora(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleString('es-PE', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima',
  })
}

export async function generarActaDesistimiento(data: ActaDesistimientoData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 60,
        info: {
          Title: `Acta de Desistimiento - ${data.tesis.codigo}`,
          Author: 'UNAMAD',
          Subject: 'Acta de Desistimiento de Proyecto de Tesis',
          Creator: 'Sistema de Seguimiento de Tesis - UNAMAD',
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // ============ ENCABEZADO ============
      doc.fontSize(14).font('Helvetica-Bold')
      doc.text('UNIVERSIDAD NACIONAL AMAZÓNICA DE MADRE DE DIOS', { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(11).font('Helvetica')
      doc.text(data.estudiante.facultad.toUpperCase(), { align: 'center' })
      doc.moveDown(0.2)
      doc.text(data.estudiante.carrera, { align: 'center' })
      doc.moveDown(1.5)
      doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke()
      doc.moveDown(1.5)

      // ============ TÍTULO ============
      doc.fontSize(14).font('Helvetica-Bold')
      doc.text('ACTA DE DESISTIMIENTO DE PROYECTO DE TESIS', { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica').fillColor('#666')
      doc.text(`Código de desistimiento: ${data.desistimiento.id}`, { align: 'center' })
      doc.fillColor('black')
      doc.moveDown(2)

      // ============ DATOS DEL TESISTA ============
      doc.fontSize(11).font('Helvetica-Bold')
      doc.text('I. DATOS DEL TESISTA')
      doc.moveDown(0.5)
      doc.font('Helvetica').fontSize(10)

      const campoDato = (etiqueta: string, valor: string) => {
        doc.font('Helvetica-Bold').text(`${etiqueta}: `, { continued: true })
        doc.font('Helvetica').text(valor)
      }

      campoDato('Nombre completo', data.estudiante.nombreCompleto)
      campoDato('DNI / Documento', data.estudiante.documento)
      if (data.estudiante.codigoEstudiante) {
        campoDato('Código de estudiante', data.estudiante.codigoEstudiante)
      }
      campoDato('Carrera', data.estudiante.carrera)
      campoDato('Facultad', data.estudiante.facultad)
      doc.moveDown(1)

      // ============ PROYECTO DE TESIS ============
      doc.fontSize(11).font('Helvetica-Bold')
      doc.text('II. PROYECTO DE TESIS')
      doc.moveDown(0.5)
      doc.fontSize(10)
      campoDato('Código de tesis', data.tesis.codigo)
      doc.font('Helvetica-Bold').text('Título: ', { continued: true })
      doc.font('Helvetica').text(data.tesis.titulo)
      campoDato('Estado al momento del desistimiento', data.desistimiento.estadoTesisAlSolicitar)
      doc.moveDown(1)

      // ============ MOTIVO DEL DESISTIMIENTO ============
      doc.fontSize(11).font('Helvetica-Bold')
      doc.text('III. MOTIVO DEL DESISTIMIENTO')
      doc.moveDown(0.5)
      doc.fontSize(10)
      campoDato('Categoría', data.desistimiento.motivoCategoriaLabel)
      doc.moveDown(0.3)
      doc.font('Helvetica-Bold').text('Descripción detallada:')
      doc.moveDown(0.2)
      doc.font('Helvetica').text(data.desistimiento.motivoDescripcion, {
        align: 'justify',
        indent: 12,
      })
      doc.moveDown(1)

      // ============ RESULTADO ============
      doc.fontSize(11).font('Helvetica-Bold')
      doc.text('IV. RESOLUCIÓN')
      doc.moveDown(0.5)
      doc.fontSize(10)
      campoDato('Fecha de solicitud', fmtFechaHora(data.desistimiento.solicitadoAt))
      campoDato('Fecha de aprobación', fmtFechaHora(data.desistimiento.aprobadoAt))
      if (data.desistimiento.aprobadoPor) {
        campoDato('Aprobado por', data.desistimiento.aprobadoPor)
      }
      doc.moveDown(0.5)

      if (data.coautorContinua) {
        doc.font('Helvetica').text(
          `El proyecto de tesis continúa bajo la responsabilidad de ${data.coautorContinua.nombreCompleto}` +
          (data.coautorContinua.codigoEstudiante ? ` (código ${data.coautorContinua.codigoEstudiante})` : '') +
          ', quien asume como autor(a) principal.',
          { align: 'justify', indent: 12 },
        )
      } else {
        doc.font('Helvetica').text(
          'El proyecto de tesis queda en estado DESISTIDO y no continuará su trámite. El estudiante ' +
          'podrá iniciar un nuevo proyecto de tesis si así lo decide.',
          { align: 'justify', indent: 12 },
        )
      }

      doc.moveDown(3)

      // ============ FIRMAS ============
      const yFirmas = doc.y
      doc.moveTo(90, yFirmas).lineTo(250, yFirmas).stroke()
      doc.moveTo(345, yFirmas).lineTo(505, yFirmas).stroke()
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica')
      doc.text('Firma del tesista', 90, doc.y, { width: 160, align: 'center' })
      doc.text('Firma mesa de partes', 345, doc.y, { width: 160, align: 'center' })

      doc.moveDown(3)

      // ============ PIE ============
      doc.fontSize(8).fillColor('#888').font('Helvetica')
      doc.text(
        `Documento generado automáticamente el ${fmtFecha(new Date())} · Sistema de Seguimiento de Tesis UNAMAD`,
        60,
        780,
        { align: 'center', width: 475 },
      )

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
