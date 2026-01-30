/**
 * Servicio para generar cartas de aceptación de asesor/coasesor en PDF
 */

import PDFDocument from 'pdfkit'

export interface CartaAceptacionData {
  // Datos del asesor
  asesor: {
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    email: string
    codigoDocente?: string
    departamento?: string
  }
  tipoAsesor: 'ASESOR' | 'COASESOR'

  // Datos de la tesis
  tesis: {
    codigo: string
    titulo: string
    carrera: string
    facultad: string
    lineaInvestigacion?: string
  }

  // Datos de los tesistas
  tesistas: {
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    codigoEstudiante: string
  }[]

  // Fecha de generación
  fecha: Date
}

/**
 * Genera un PDF de carta de aceptación
 */
export async function generarCartaAceptacion(data: CartaAceptacionData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 60,
        info: {
          Title: `Carta de Aceptación - ${data.tesis.codigo}`,
          Author: `${data.asesor.apellidoPaterno} ${data.asesor.apellidoMaterno}, ${data.asesor.nombres}`,
          Subject: 'Carta de Aceptación de Asesoría de Tesis',
          Creator: 'Sistema de Seguimiento de Tesis - UNAMAD',
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const tipoAsesorText = data.tipoAsesor === 'ASESOR' ? 'Asesor' : 'Coasesor'
      const nombreAsesor = `${data.asesor.apellidoPaterno} ${data.asesor.apellidoMaterno}, ${data.asesor.nombres}`

      // Formatear fecha
      const opciones: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
      const fechaFormateada = data.fecha.toLocaleDateString('es-PE', opciones)

      // Logo y membrete
      doc.fontSize(16).font('Helvetica-Bold')
      doc.text('UNIVERSIDAD NACIONAL AMAZÓNICA DE MADRE DE DIOS', { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(12).font('Helvetica')
      doc.text(data.tesis.facultad.toUpperCase(), { align: 'center' })
      doc.moveDown(0.3)
      doc.text(data.tesis.carrera, { align: 'center' })

      doc.moveDown(2)

      // Línea decorativa
      doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke()

      doc.moveDown(2)

      // Título del documento
      doc.fontSize(14).font('Helvetica-Bold')
      doc.text(`CARTA DE ACEPTACIÓN DE ${tipoAsesorText.toUpperCase()}ÍA DE TESIS`, { align: 'center' })

      doc.moveDown(2)

      // Cuerpo de la carta
      doc.fontSize(11).font('Helvetica')

      // Destinatario
      doc.text('Señor(a):', { continued: false })
      doc.font('Helvetica-Bold')
      doc.text('Director(a) de la Unidad de Investigación', { continued: false })
      doc.font('Helvetica')
      doc.text(`Facultad: ${data.tesis.facultad}`, { continued: false })
      doc.text('Universidad Nacional Amazónica de Madre de Dios', { continued: false })
      doc.text('Presente.-', { continued: false })

      doc.moveDown(1.5)

      // Asunto
      doc.font('Helvetica-Bold')
      doc.text('ASUNTO: ', { continued: true })
      doc.font('Helvetica')
      doc.text(`Aceptación de ${tipoAsesorText}ía de Tesis`, { continued: false })

      doc.moveDown(1.5)

      // Cuerpo principal
      doc.text(
        `Es grato dirigirme a usted para saludarle cordialmente y a la vez comunicarle que, habiendo revisado el proyecto de tesis titulado:`,
        { align: 'justify' }
      )

      doc.moveDown(0.8)

      // Título de la tesis (destacado)
      doc.font('Helvetica-Bold')
      doc.text(`"${data.tesis.titulo}"`, { align: 'center' })

      doc.moveDown(0.8)

      doc.font('Helvetica')
      doc.text('Presentado por:', { continued: false })

      doc.moveDown(0.5)

      // Lista de tesistas
      data.tesistas.forEach((tesista, index) => {
        const nombreTesista = `${tesista.apellidoPaterno} ${tesista.apellidoMaterno}, ${tesista.nombres}`
        doc.text(`   ${index + 1}. ${nombreTesista} (Código: ${tesista.codigoEstudiante})`)
      })

      doc.moveDown(1)

      doc.text(
        `Mediante la presente, manifiesto mi ACEPTACIÓN para desempeñarme como ${tipoAsesorText.toUpperCase()} del proyecto de tesis mencionado, comprometiéndome a orientar y supervisar el desarrollo de la investigación hasta su culminación, de acuerdo a las normas y reglamentos vigentes de la Universidad Nacional Amazónica de Madre de Dios.`,
        { align: 'justify' }
      )

      doc.moveDown(1)

      doc.text(
        'Me comprometo a revisar oportunamente los avances del trabajo de investigación y a participar activamente en el proceso de asesoría académica que requiera el desarrollo de la tesis.',
        { align: 'justify' }
      )

      doc.moveDown(1)

      doc.text(
        'Sin otro particular, me despido de usted, reiterándole mi consideración y estima personal.',
        { align: 'justify' }
      )

      doc.moveDown(1.5)

      doc.text(`Puerto Maldonado, ${fechaFormateada}`, { align: 'right' })

      doc.moveDown(3)

      // Espacio para firma digital
      doc.moveTo(200, doc.y).lineTo(420, doc.y).dash(3, { space: 3 }).stroke()
      doc.undash()

      doc.moveDown(0.5)

      doc.font('Helvetica-Bold')
      doc.text(nombreAsesor, { align: 'center' })
      doc.font('Helvetica')
      doc.text(tipoAsesorText + ' de Tesis', { align: 'center' })
      if (data.asesor.codigoDocente) {
        doc.text(`Código: ${data.asesor.codigoDocente}`, { align: 'center' })
      }
      if (data.asesor.departamento) {
        doc.text(data.asesor.departamento, { align: 'center' })
      }
      doc.text(data.asesor.email, { align: 'center' })

      doc.moveDown(3)

      // Información del documento
      doc.fontSize(8).fillColor('#666666')
      doc.text(`Código de Tesis: ${data.tesis.codigo}`, { align: 'center' })
      if (data.tesis.lineaInvestigacion) {
        doc.text(`Línea de Investigación: ${data.tesis.lineaInvestigacion}`, { align: 'center' })
      }
      doc.text('Este documento requiere firma digital para su validez oficial.', { align: 'center' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
