export interface Documento {
  id: string
  tipoDocumento: string
  nombre: string
  archivoUrl: string
  archivoTamano: number
  archivoMimeType: string
  createdAt: string
  subidoPor?: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
  }
}

export interface Tesis {
  id: string
  codigo: string
  titulo: string
  resumen: string | null
  palabrasClave: string[]
  lineaInvestigacion: string | null
  carreraNombre: string
  estado: string
  createdAt: string
  fechaRegistro: string | null
  autores: {
    id: string
    tipoParticipante: string
    estado: string
    motivoRechazo?: string | null
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
    studentCareer: {
      codigoEstudiante: string
    }
  }[]
  asesores: {
    id: string
    tipoAsesor: string
    estado: string
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
  }[]
  voucherFisicoEntregado: boolean
  voucherInformeFisicoEntregado: boolean
  voucherSustentacionFisicoEntregado: boolean
  voucherSustentacionFisicoFecha: string | null
  ejemplaresEntregados: boolean
  ejemplaresEntregadosFecha: string | null
  facultad: {
    id: string
    nombre: string
  }
  documentos: Documento[]
}

export interface Participante {
  id: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string
  codigoEstudiante?: string
  codigoDocente?: string
  carrera?: string
  departamento?: string
  studentCareerId?: string
}
