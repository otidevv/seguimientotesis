export interface Documento {
  id: string
  tipo: string
  nombre: string
  url: string
  mimeType: string
  tamano: number
  firmado: boolean
  fechaFirma: string | null
  fechaSubida: string
  subidoPor: string | null
}

export interface Autor {
  id: string
  tipoParticipante: string
  estado: string
  nombre: string
  email: string
  dni: string
  codigo: string
  carrera: string
}

export interface Asesor {
  id: string
  tipo: string
  estado: string
  nombre: string
  email: string
}

export interface EvaluacionJurado {
  id: string
  ronda: number
  resultado: string
  observaciones: string | null
  archivoUrl: string | null
  fecha: string
}

export interface Jurado {
  id: string
  tipo: string
  fase: string
  nombre: string
  email: string
  userId: string
  evaluaciones: EvaluacionJurado[]
}

export interface HistorialItem {
  id: string
  estadoAnterior: string | null
  estadoNuevo: string
  comentario: string | null
  fecha: string
  realizadoPor: string
}

export interface Proyecto {
  id: string
  codigo: string
  titulo: string
  resumen: string | null
  palabrasClave: string[]
  estado: string
  lineaInvestigacion: string | null
  voucherFisicoEntregado: boolean
  voucherFisicoFecha: string | null
  voucherInformeFisicoEntregado: boolean
  voucherInformeFisicoFecha: string | null
  voucherSustentacionFisicoEntregado: boolean
  voucherSustentacionFisicoFecha: string | null
  ejemplaresEntregados: boolean
  ejemplaresEntregadosFecha: string | null
  fechaSustentacion: string | null
  lugarSustentacion: string | null
  modalidadSustentacion: string | null
  createdAt: string
  carrera: string
  facultad: {
    id: string
    nombre: string
    codigo: string
  } | null
  autores: Autor[]
  asesores: Asesor[]
  documentos: Documento[]
  jurados: Jurado[]
  historial: HistorialItem[]
  rondaActual: number
  faseActual: string | null
  fechaLimiteEvaluacion: string | null
  fechaLimiteCorreccion: string | null
}

export interface BusquedaJurado {
  id: string
  nombreCompleto: string
  email: string
  numeroDocumento: string
  esDocente: boolean
  codigoDocente: string | null
  departamento: string | null
  facultad: string | null
  roles: string[]
}
