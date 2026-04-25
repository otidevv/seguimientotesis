import nodemailer from 'nodemailer'

// Configuración SMTP por facultad
// Cada facultad tiene su propio correo SMTP
interface FacultyMailConfig {
  user: string
  password: string
  from: string
}

function getFacultyMailConfig(facultyCodigo: string): FacultyMailConfig | null {
  // Fallback global: MAIL_USER/MAIL_PASSWORD/MAIL_FROM se usan cuando no hay
  // config específica de la facultad. Permite operar con un único correo SMTP
  // sin necesidad de declarar MAIL_FI_*, MAIL_FE_*, MAIL_FCE_* por separado.
  const globalUser = process.env.MAIL_USER || ''
  const globalPass = process.env.MAIL_PASSWORD || ''
  const globalFrom = process.env.MAIL_FROM || '"SeguiTesis UNAMAD" <noreply@unamad.edu.pe>'

  const configs: Record<string, FacultyMailConfig> = {
    FI: {
      user: process.env.MAIL_FI_USER || globalUser,
      password: process.env.MAIL_FI_PASSWORD || globalPass,
      from: process.env.MAIL_FI_FROM || globalFrom,
    },
    FE: {
      user: process.env.MAIL_FE_USER || globalUser,
      password: process.env.MAIL_FE_PASSWORD || globalPass,
      from: process.env.MAIL_FE_FROM || globalFrom,
    },
    FCE: {
      user: process.env.MAIL_FCE_USER || globalUser,
      password: process.env.MAIL_FCE_PASSWORD || globalPass,
      from: process.env.MAIL_FCE_FROM || globalFrom,
    },
  }

  const config = configs[facultyCodigo]
  if (!config || !config.user || !config.password) {
    console.warn(`[Email] No hay config SMTP para facultad: ${facultyCodigo}, usando FI como fallback`)
    const fallback = configs['FI']
    if (!fallback || !fallback.user || !fallback.password) return null
    return fallback
  }
  return config
}

function createTransporter(facultyCodigo?: string) {
  const host = process.env.MAIL_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.MAIL_PORT || '587')

  if (facultyCodigo) {
    const config = getFacultyMailConfig(facultyCodigo)
    if (config) {
      return {
        transporter: nodemailer.createTransport({
          host,
          port,
          secure: false,
          auth: { user: config.user, pass: config.password },
        }),
        from: config.from,
      }
    }
  }

  // Fallback: usar FI como default (que ya hace fallback al global MAIL_USER si no hay MAIL_FI_USER)
  const fiConfig = getFacultyMailConfig('FI')
  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: {
        user: fiConfig?.user || process.env.MAIL_USER || '',
        pass: fiConfig?.password || process.env.MAIL_PASSWORD || '',
      },
    }),
    from: fiConfig?.from || process.env.MAIL_FROM || '"SeguiTesis UNAMAD" <noreply@unamad.edu.pe>',
  }
}

// Verificar conexión (opcional, para debugging)
export async function verifyEmailConnection(facultyCodigo?: string): Promise<boolean> {
  try {
    const { transporter } = createTransporter(facultyCodigo)
    await transporter.verify()
    console.log(`[Email] Conexión SMTP verificada${facultyCodigo ? ` (${facultyCodigo})` : ''}`)
    return true
  } catch (error) {
    console.error('[Email] Error de conexión SMTP:', error)
    return false
  }
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Enviar email usando la config de una facultad específica
export async function sendEmailByFaculty(facultyCodigo: string, options: SendEmailOptions): Promise<boolean> {
  try {
    const { transporter, from } = createTransporter(facultyCodigo)
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
    })

    console.log(`[Email][${facultyCodigo}] Mensaje enviado a ${options.to}:`, info.messageId)
    return true
  } catch (error) {
    console.error(`[Email][${facultyCodigo}] Error al enviar a ${options.to}:`, error)
    return false
  }
}

// Enviar email (usa FI como default - compatibilidad con código existente)
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  return sendEmailByFaculty('FI', options)
}

// Templates de email
export const emailTemplates = {
  passwordReset: (userName: string, resetUrl: string, expiresIn: string = '1 hora') => ({
    subject: 'Restablecer contraseña - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer Contraseña</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazónica de Madre de Dios</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Restablecer Contraseña</h2>

                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>

                    <p style="color: #475569; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
                      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente botón para crear una nueva contraseña:
                    </p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                            Restablecer Contraseña
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #64748b; margin: 24px 0 0; font-size: 13px; line-height: 1.6;">
                      Este enlace expirará en <strong>${expiresIn}</strong>. Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
                    </p>

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

                    <p style="color: #94a3b8; margin: 0; font-size: 12px; line-height: 1.6;">
                      Si el botón no funciona, copia y pega este enlace en tu navegador:
                    </p>
                    <p style="color: #3b82f6; margin: 8px 0 0; font-size: 12px; word-break: break-all;">
                      ${resetUrl}
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      © ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automático, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Hola ${userName},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en SeguiTesis UNAMAD.

Para restablecer tu contraseña, visita el siguiente enlace:
${resetUrl}

Este enlace expirará en ${expiresIn}.

Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.

--
SeguiTesis UNAMAD
Universidad Nacional Amazónica de Madre de Dios
    `,
  }),

  // Notificación al tesista cuando se crea su proyecto
  thesisCreated: (userName: string, tesisTitulo: string, asesorNombre: string, tesisUrl: string) => ({
    subject: 'Proyecto de Tesis Registrado - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proyecto Registrado</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Proyecto de Tesis Registrado</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Tu proyecto de tesis ha sido registrado exitosamente en el sistema SeguiTesis.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #166534; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #166534; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Asesor Principal</p>
                          <p style="color: #1e293b; margin: 0; font-size: 15px;">${asesorNombre}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Tu proyecto se encuentra en estado <strong>BORRADOR</strong>. Para enviarlo a revision, debes completar los siguientes pasos:
                    </p>
                    <ul style="color: #475569; margin: 0 0 24px; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                      <li>Subir el documento del proyecto de tesis</li>
                      <li>Esperar la aceptacion del asesor</li>
                      <li>Subir la carta de aceptacion del asesor</li>
                      <li>Subir el voucher de pago</li>
                      <li>Subir documento sustentatorio (constancia de matricula)</li>
                    </ul>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                            Ver Mi Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${userName},\n\nTu proyecto de tesis ha sido registrado exitosamente.\n\nTitulo: ${tesisTitulo}\nAsesor: ${asesorNombre}\nEstado: BORRADOR\n\nPuedes ver tu proyecto en: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Invitación al asesor cuando se crea un proyecto
  advisorInvitation: (asesorNombre: string, tesistaNombre: string, tesisTitulo: string, invitacionesUrl: string) => ({
    subject: 'Invitacion como Asesor de Tesis - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitacion de Asesoria</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Invitacion como Asesor</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Estimado(a) <strong>${asesorNombre}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      El estudiante <strong>${tesistaNombre}</strong> le ha invitado como <strong>Asesor Principal</strong> de su proyecto de tesis.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #1e40af; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #1e40af; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Tesista</p>
                          <p style="color: #1e293b; margin: 0; font-size: 15px;">${tesistaNombre}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Por favor, ingrese al sistema para <strong>aceptar o rechazar</strong> esta invitacion.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${invitacionesUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                            Ver Invitacion
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Estimado(a) ${asesorNombre},\n\nEl estudiante ${tesistaNombre} le ha invitado como Asesor Principal de su proyecto de tesis.\n\nTitulo: ${tesisTitulo}\n\nPor favor, ingrese al sistema para aceptar o rechazar la invitacion:\n${invitacionesUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Invitación al coautor cuando se crea un proyecto
  coauthorInvitation: (coautorNombre: string, tesistaNombre: string, tesisTitulo: string, invitacionesUrl: string) => ({
    subject: 'Invitacion como Coautor de Tesis - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitacion de Coautoria</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #ddd6fe; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Invitacion como Coautor</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${coautorNombre}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      El estudiante <strong>${tesistaNombre}</strong> te ha invitado como <strong>Coautor</strong> de su proyecto de tesis.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f3ff; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Por favor, ingresa al sistema para <strong>aceptar o rechazar</strong> esta invitacion.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${invitacionesUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);">
                            Ver Invitacion
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${coautorNombre},\n\nEl estudiante ${tesistaNombre} te ha invitado como Coautor de su proyecto de tesis.\n\nTitulo: ${tesisTitulo}\n\nPor favor, ingresa al sistema para aceptar o rechazar la invitacion:\n${invitacionesUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Invitación al coasesor cuando se crea un proyecto
  coadvisorInvitation: (coasesorNombre: string, tesistaNombre: string, tesisTitulo: string, invitacionesUrl: string) => ({
    subject: 'Invitacion como Coasesor de Tesis - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitacion de Coasesoria</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #b45309 0%, #f59e0b 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #fde68a; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Invitacion como Coasesor</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Estimado(a) <strong>${coasesorNombre}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      El estudiante <strong>${tesistaNombre}</strong> le ha invitado como <strong>Coasesor</strong> de su proyecto de tesis.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #92400e; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Por favor, ingrese al sistema para <strong>aceptar o rechazar</strong> esta invitacion.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${invitacionesUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #b45309 0%, #f59e0b 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                            Ver Invitacion
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Estimado(a) ${coasesorNombre},\n\nEl estudiante ${tesistaNombre} le ha invitado como Coasesor de su proyecto de tesis.\n\nTitulo: ${tesisTitulo}\n\nPor favor, ingrese al sistema para aceptar o rechazar la invitacion:\n${invitacionesUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación cuando la tesis se envía a revisión (al tesista)
  thesisSubmittedForReview: (userName: string, tesisTitulo: string, facultadNombre: string, tesisUrl: string) => ({
    subject: 'Proyecto de Tesis Enviado a Revision - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tesis Enviada a Revision</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #bae6fd; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Proyecto Enviado a Revision</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Tu proyecto de tesis ha sido enviado a revision exitosamente. El area de Mesa de Partes de la <strong>${facultadNombre}</strong> procedera a revisar tu expediente.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #0c4a6e; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #0c4a6e; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Estado Actual</p>
                          <p style="color: #0369a1; margin: 0; font-size: 15px; font-weight: 600;">EN REVISION</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Te notificaremos cuando haya una actualizacion sobre el estado de tu proyecto.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);">
                            Ver Mi Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${userName},\n\nTu proyecto de tesis ha sido enviado a revision exitosamente.\n\nTitulo: ${tesisTitulo}\nFacultad: ${facultadNombre}\nEstado: EN REVISION\n\nPuedes ver tu proyecto en: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación al asesor cuando la tesis se envía a revisión
  thesisSubmittedForReviewAdvisor: (asesorNombre: string, tesistaNombre: string, tesisTitulo: string, facultadNombre: string, tesisUrl: string) => ({
    subject: 'Proyecto de Tesis Enviado a Revision - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tesis Enviada a Revision</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #bae6fd; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Proyecto Enviado a Revision</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Estimado(a) <strong>${asesorNombre}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Le informamos que el proyecto de tesis del estudiante <strong>${tesistaNombre}</strong>, del cual usted es asesor, ha sido enviado a revision ante la <strong>${facultadNombre}</strong>.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #0c4a6e; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #0c4a6e; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Tesista</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">${tesistaNombre}</p>
                          <p style="color: #0c4a6e; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Estado Actual</p>
                          <p style="color: #0369a1; margin: 0; font-size: 15px; font-weight: 600;">EN REVISION</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);">
                            Ver Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Estimado(a) ${asesorNombre},\n\nEl proyecto de tesis del estudiante ${tesistaNombre} ha sido enviado a revision.\n\nTitulo: ${tesisTitulo}\nFacultad: ${facultadNombre}\nEstado: EN REVISION\n\nPuede ver el proyecto en: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación al tesista cuando el asesor registra su carta de aceptación
  advisorLetterRegistered: (tesistaNombre: string, asesorNombre: string, tipoAsesor: string, tesisTitulo: string, facultadNombre: string, tesisUrl: string) => ({
    subject: `Carta de Aceptacion del ${tipoAsesor === 'asesor' ? 'Asesor' : 'Co-asesor'} Registrada - SeguiTesis UNAMAD`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Carta de Aceptacion Registrada</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Carta de Aceptacion Registrada</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${tesistaNombre}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      El <strong>${tipoAsesor}</strong> <strong>${asesorNombre}</strong> ha registrado su carta de aceptacion para tu proyecto de tesis.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #166534; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #166534; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">${tipoAsesor === 'asesor' ? 'Asesor' : 'Co-asesor'}</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">${asesorNombre}</p>
                          <p style="color: #166534; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Facultad</p>
                          <p style="color: #1e293b; margin: 0; font-size: 15px;">${facultadNombre}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Revisa tu proyecto para ver el avance de los requisitos necesarios para enviar a revision.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                            Ver Mi Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${tesistaNombre},\n\nEl ${tipoAsesor} ${asesorNombre} ha registrado su carta de aceptacion para tu proyecto de tesis.\n\nTitulo: ${tesisTitulo}\nFacultad: ${facultadNombre}\n\nRevisa tu proyecto en: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación cuando mesa de partes observa el proyecto
  thesisObserved: (userName: string, tesisTitulo: string, observaciones: string, facultadNombre: string, tesisUrl: string) => ({
    subject: 'Proyecto de Tesis Observado - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proyecto Observado</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #c2410c 0%, #f97316 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #fed7aa; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Proyecto Observado</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Tu proyecto de tesis ha sido <strong>observado</strong> por Mesa de Partes de la <strong>${facultadNombre}</strong>. Por favor revisa las observaciones y realiza las correcciones necesarias.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff7ed; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #9a3412; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #9a3412; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Observaciones</p>
                          <p style="color: #1e293b; margin: 0; font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${observaciones}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Corrige las observaciones y vuelve a enviar tu proyecto a revision.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #c2410c 0%, #f97316 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);">
                            Ver Mi Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${userName},\n\nTu proyecto de tesis ha sido observado por Mesa de Partes de la ${facultadNombre}.\n\nTitulo: ${tesisTitulo}\n\nObservaciones:\n${observaciones}\n\nCorrige las observaciones y vuelve a enviar tu proyecto.\n\nVer proyecto: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación cuando mesa de partes aprueba documentos
  thesisApproved: (userName: string, tesisTitulo: string, facultadNombre: string, tesisUrl: string) => ({
    subject: 'Documentos de Tesis Aprobados - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documentos Aprobados</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Documentos Aprobados</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Los documentos de tu proyecto de tesis han sido <strong>aprobados</strong> por Mesa de Partes de la <strong>${facultadNombre}</strong>. Tu proyecto pasara a la fase de evaluacion por jurados.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #166534; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #166534; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Estado Actual</p>
                          <p style="color: #059669; margin: 0; font-size: 15px; font-weight: 600;">APROBADO - ASIGNANDO JURADOS</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                            Ver Mi Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${userName},\n\nLos documentos de tu proyecto de tesis han sido aprobados por Mesa de Partes de la ${facultadNombre}.\n\nTitulo: ${tesisTitulo}\nEstado: APROBADO - ASIGNANDO JURADOS\n\nVer proyecto: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación cuando mesa de partes rechaza el proyecto
  thesisRejected: (userName: string, tesisTitulo: string, motivo: string, facultadNombre: string, tesisUrl: string) => ({
    subject: 'Proyecto de Tesis Rechazado - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proyecto Rechazado</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #fecaca; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Proyecto Rechazado</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Lamentamos informarte que tu proyecto de tesis ha sido <strong>rechazado</strong> por Mesa de Partes de la <strong>${facultadNombre}</strong>.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #991b1b; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #991b1b; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Motivo del Rechazo</p>
                          <p style="color: #1e293b; margin: 0; font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${motivo}</p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);">
                            Ver Mi Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${userName},\n\nTu proyecto de tesis ha sido rechazado por Mesa de Partes de la ${facultadNombre}.\n\nTitulo: ${tesisTitulo}\n\nMotivo:\n${motivo}\n\nVer proyecto: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación al jurado cuando es asignado como evaluador
  juryAssigned: (juradoNombre: string, tipoJurado: string, tesisTitulo: string, tesistaNombre: string, facultadNombre: string, fechaLimite: string, tesisUrl: string) => ({
    subject: `Asignado como ${tipoJurado} de Jurado Evaluador - SeguiTesis UNAMAD`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Asignacion como Jurado</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #ddd6fe; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Asignacion como Jurado Evaluador</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Estimado/a <strong>${juradoNombre}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Ha sido designado/a como <strong>${tipoJurado}</strong> del jurado evaluador del siguiente proyecto de tesis:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f3ff; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Tesista(s)</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">${tesistaNombre}</p>
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Facultad</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">${facultadNombre}</p>
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Rol Asignado</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">${tipoJurado}</p>
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Fecha Limite de Evaluacion</p>
                          <p style="color: #dc2626; margin: 0; font-size: 15px; font-weight: 600;">${fechaLimite}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Por favor ingrese al sistema para revisar el proyecto y emitir su evaluacion dentro del plazo establecido.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);">
                            Ver Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Estimado/a ${juradoNombre},\n\nHa sido designado/a como ${tipoJurado} del jurado evaluador del siguiente proyecto de tesis:\n\nTitulo: ${tesisTitulo}\nTesista(s): ${tesistaNombre}\nFacultad: ${facultadNombre}\nFecha limite: ${fechaLimite}\n\nIngrese al sistema para revisar y evaluar: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación al tesista cuando se confirman los jurados
  juryConfirmedStudent: (tesistaNombre: string, tesisTitulo: string, facultadNombre: string, fechaLimite: string, tesisUrl: string) => ({
    subject: 'Jurados Asignados - Evaluacion Iniciada - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jurados Asignados</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #ddd6fe; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Jurados Asignados - Evaluacion Iniciada</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${tesistaNombre}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Los jurados evaluadores de tu proyecto de tesis han sido confirmados y el proceso de evaluacion ha iniciado.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f3ff; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo del Proyecto</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Facultad</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">${facultadNombre}</p>
                          <p style="color: #5b21b6; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Fecha Limite de Evaluacion</p>
                          <p style="color: #dc2626; margin: 0; font-size: 15px; font-weight: 600;">${fechaLimite}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Los jurados evaluaran tu proyecto dentro del plazo establecido. Te notificaremos cuando haya resultados.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);">
                            Ver Mi Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${tesistaNombre},\n\nLos jurados evaluadores de tu proyecto de tesis han sido confirmados y la evaluacion ha iniciado.\n\nTitulo: ${tesisTitulo}\nFacultad: ${facultadNombre}\nFecha limite de evaluacion: ${fechaLimite}\n\nPuedes ver el estado de tu proyecto en: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación del resultado del dictamen del jurado
  juryDictamen: (userName: string, tesisTitulo: string, resultado: string, fase: string, observaciones: string, facultadNombre: string, tesisUrl: string) => ({
    subject: resultado === 'APROBADO'
      ? `Proyecto ${fase === 'INFORME_FINAL' ? '(Informe Final)' : ''} Aprobado por Jurado - SeguiTesis UNAMAD`
      : `Proyecto ${fase === 'INFORME_FINAL' ? '(Informe Final)' : ''} Observado por Jurado - SeguiTesis UNAMAD`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dictamen del Jurado</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, ${resultado === 'APROBADO' ? '#059669 0%, #10b981' : '#d97706 0%, #f59e0b'} 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: ${resultado === 'APROBADO' ? '#a7f3d0' : '#fef3c7'}; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">
                      ${resultado === 'APROBADO' ? `${fase === 'INFORME_FINAL' ? 'Informe Final' : 'Proyecto'} Aprobado por el Jurado` : `${fase === 'INFORME_FINAL' ? 'Informe Final' : 'Proyecto'} Observado por el Jurado`}
                    </h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      ${resultado === 'APROBADO'
                        ? `El jurado evaluador ha emitido su dictamen de <strong>aprobacion</strong> para tu ${fase === 'INFORME_FINAL' ? 'informe final' : 'proyecto de tesis'}.`
                        : `El jurado evaluador ha emitido <strong>observaciones</strong> a tu ${fase === 'INFORME_FINAL' ? 'informe final' : 'proyecto de tesis'}. Debes realizar las correcciones correspondientes.`}
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${resultado === 'APROBADO' ? '#f0fdf4' : '#fffbeb'}; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: ${resultado === 'APROBADO' ? '#166534' : '#92400e'}; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: ${resultado === 'APROBADO' ? '#166534' : '#92400e'}; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Facultad</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">${facultadNombre}</p>
                          <p style="color: ${resultado === 'APROBADO' ? '#166534' : '#92400e'}; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Resultado</p>
                          <p style="color: ${resultado === 'APROBADO' ? '#059669' : '#d97706'}; margin: 0; font-size: 16px; font-weight: 700;">${resultado === 'APROBADO' ? 'APROBADO' : 'OBSERVADO'}</p>
                        </td>
                      </tr>
                    </table>
                    ${observaciones ? `
                    <div style="background-color: #f8fafc; border-left: 4px solid ${resultado === 'APROBADO' ? '#10b981' : '#f59e0b'}; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                      <p style="color: #64748b; margin: 0 0 8px; font-size: 13px; font-weight: 600;">Observaciones:</p>
                      <p style="color: #1e293b; margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${observaciones}</p>
                    </div>` : ''}
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${resultado === 'APROBADO' ? '#059669 0%, #10b981' : '#d97706 0%, #f59e0b'} 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px;">
                            Ver Mi Proyecto
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Hola ${userName},\n\nEl jurado evaluador ha emitido su dictamen para tu ${fase === 'INFORME_FINAL' ? 'informe final' : 'proyecto de tesis'}.\n\nTitulo: ${tesisTitulo}\nFacultad: ${facultadNombre}\nResultado: ${resultado}\n${observaciones ? `\nObservaciones:\n${observaciones}\n` : ''}\nVer proyecto: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  // Notificación a jurados cuando el tesista reenvía proyecto/informe corregido
  thesisResubmittedToJury: (juradoNombre: string, tesistaNombre: string, tesisTitulo: string, fase: string, ronda: number, facultadNombre: string, fechaLimite: string, tesisUrl: string) => ({
    subject: `Documento Corregido Reenviado - Ronda ${ronda} - SeguiTesis UNAMAD`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documento Corregido Reenviado</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazonica de Madre de Dios</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Documento Corregido Reenviado</h2>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Estimado/a <strong>${juradoNombre}</strong>,
                    </p>
                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      El tesista <strong>${tesistaNombre}</strong> ha reenviado su ${fase === 'INFORME_FINAL' ? 'informe final' : 'proyecto de tesis'} corregido para una nueva ronda de evaluacion.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border-radius: 8px; margin: 16px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #1e40af; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Titulo</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px; line-height: 1.5;">${tesisTitulo}</p>
                          <p style="color: #1e40af; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Facultad</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">${facultadNombre}</p>
                          <p style="color: #1e40af; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Ronda de Evaluacion</p>
                          <p style="color: #1e293b; margin: 0 0 16px; font-size: 15px;">Ronda ${ronda}</p>
                          <p style="color: #1e40af; margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase;">Fecha Limite de Evaluacion</p>
                          <p style="color: #dc2626; margin: 0; font-size: 15px; font-weight: 600;">${fechaLimite}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #475569; margin: 16px 0; font-size: 15px; line-height: 1.6;">
                      Por favor ingrese al sistema para revisar el documento corregido y emitir su nueva evaluacion dentro del plazo establecido.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${tesisUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
                              Evaluar Documento
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 12px;">
                      Este es un correo automatico, por favor no respondas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Estimado/a ${juradoNombre},\n\nEl tesista ${tesistaNombre} ha reenviado su ${fase === 'INFORME_FINAL' ? 'informe final' : 'proyecto de tesis'} corregido.\n\nTitulo: ${tesisTitulo}\nFacultad: ${facultadNombre}\nRonda: ${ronda}\nFecha limite: ${fechaLimite}\n\nIngrese al sistema para evaluar: ${tesisUrl}\n\n--\nSeguiTesis UNAMAD`,
  }),

  emailVerification: (userName: string, verifyUrl: string) => ({
    subject: 'Verifica tu correo - SeguiTesis UNAMAD',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificar Correo</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SeguiTesis</h1>
                    <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 14px;">Universidad Nacional Amazónica de Madre de Dios</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Verifica tu correo electrónico</h2>

                    <p style="color: #475569; margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>

                    <p style="color: #475569; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
                      Gracias por registrarte en SeguiTesis. Por favor verifica tu correo electrónico haciendo clic en el siguiente botón:
                    </p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                            Verificar Correo
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #64748b; margin: 24px 0 0; font-size: 13px; line-height: 1.6;">
                      Este enlace expirará en <strong>24 horas</strong>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                      © ${new Date().getFullYear()} SeguiTesis UNAMAD. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Hola ${userName},

Gracias por registrarte en SeguiTesis UNAMAD.

Para verificar tu correo electrónico, visita el siguiente enlace:
${verifyUrl}

Este enlace expirará en 24 horas.

--
SeguiTesis UNAMAD
Universidad Nacional Amazónica de Madre de Dios
    `,
  }),
}
