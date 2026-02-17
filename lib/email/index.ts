import nodemailer from 'nodemailer'

// Configuración del transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
})

// Verificar conexión (opcional, para debugging)
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify()
    console.log('[Email] Conexión SMTP verificada')
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

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"SeguiTesis UNAMAD" <noreply@unamad.edu.pe>',
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
    })

    console.log('[Email] Mensaje enviado:', info.messageId)
    return true
  } catch (error) {
    console.error('[Email] Error al enviar:', error)
    return false
  }
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
