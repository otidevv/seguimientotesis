/**
 * Validación server-side de archivos por contenido real (magic bytes), no por
 * `file.type` o extensión — ambos son falsificables por el cliente.
 *
 * Antes (bug #9 de la auditoría): los endpoints solo verificaban
 * `file.type !== 'application/pdf'`, header del request que un cliente
 * malicioso puede setear a cualquier valor. Permitía subir binarios
 * arbitrarios disfrazados de PDF.
 */

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const // "%PDF"

/**
 * Verifica que los primeros bytes del archivo sean la firma PDF (`%PDF-`).
 * Devuelve `null` si es válido o un mensaje de error si no lo es.
 */
export async function validarPDFContenido(file: File): Promise<string | null> {
  if (file.size < PDF_MAGIC.length) {
    return 'Archivo vacío o corrupto'
  }
  const slice = file.slice(0, PDF_MAGIC.length)
  const buffer = await slice.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (bytes[i] !== PDF_MAGIC[i]) {
      return 'El archivo no es un PDF válido (firma de contenido inválida)'
    }
  }
  return null
}

/**
 * Validación combinada: extensión, tamaño y magic bytes.
 * Errores devueltos en el mismo formato que `validarArchivoPDF` cliente.
 */
export async function validarPDFCompleto(
  file: File,
  maxMB = 25,
): Promise<string | null> {
  if (file.size > maxMB * 1024 * 1024) {
    return `El archivo "${file.name}" excede el límite de ${maxMB}MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`
  }
  if (file.size === 0) {
    return 'Archivo vacío'
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return 'Solo se permiten archivos PDF'
  }
  return validarPDFContenido(file)
}
