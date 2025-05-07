// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private configService: ConfigService) {
    // For production environment - use your actual SMTP settings
    if (process.env.NODE_ENV === 'production') {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('EMAIL_HOST'),
        port: this.configService.get('EMAIL_PORT'),
        secure: this.configService.get('EMAIL_SECURE') === 'true',
        auth: {
          user: this.configService.get('EMAIL_USER'),
          pass: this.configService.get('EMAIL_PASS'),
        },
      });
    } else {
      // For development environment - use Ethereal's testing service or logging
      this.setupDevTransporter();
    }
  }

  private async setupDevTransporter() {
    // Use Ethereal for testing emails in development
    if (this.configService.get('USE_ETHEREAL') === 'true') {
      try {
        // Create a test account at Ethereal
        const testAccount = await nodemailer.createTestAccount();
        
        // Create a development transporter using Ethereal
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        console.log('Using Ethereal Email for development');
        console.log(`Test email account: ${testAccount.user}`);
      } catch (error) {
        console.error('Failed to create Ethereal account, falling back to logging:', error);
        this.setupLoggingTransporter();
      }
    } else {
      this.setupLoggingTransporter();
    }
  }

  private setupLoggingTransporter() {
    // Create a transporter that just logs emails instead of sending them
    this.transporter = {
      sendMail: (mailOptions) => {
        console.log('Email would have been sent:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Content:', mailOptions.html || mailOptions.text);
        return Promise.resolve({ messageId: 'dev-mode-' + Date.now() });
      },
    };
  }

  async sendCourseAccessEmail(to: string, courseData: any) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Academia Uniprotec" <${this.configService.get('EMAIL_FROM') || 'noreply@academia-uniprotec.com'}>`,
        to,
        subject: `Acceso al curso: ${courseData.title}`,
        html: `
          <h1>¡Gracias por tu compra!</h1>
          <p>Aquí tienes los detalles para acceder a tu curso:</p>
          <p><strong>Curso:</strong> ${courseData.title}</p>
          <p><strong>Fecha:</strong> ${new Date(courseData.selectedDate).toLocaleDateString('es-MX')}</p>
          <p><strong>Enlace Zoom:</strong> <a href="${courseData.zoomLink}">${courseData.zoomLink}</a></p>
          <p><strong>ID de la reunión:</strong> ${courseData.zoomMeetingId}</p>
          <p><strong>Contraseña:</strong> ${courseData.zoomPassword}</p>
          <p>Por favor guarda esta información. También puedes acceder a estos datos en tu área de cliente.</p>
        `,
      });
      
      this.logEmailResult(info);
      return info;
    } catch (error) {
      console.error(`Failed to send course access email to ${to}:`, error);
      throw error;
    }
  }

  async sendReminderEmail(email: string, courseData: any, daysUntil: number) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Academia Uniprotec" <${this.configService.get('EMAIL_FROM') || 'noreply@academia-uniprotec.com'}>`,
        to: email,
        subject: `Recordatorio: Tu curso comienza en ${daysUntil} días`,
        html: `
          <h1>Recordatorio de curso próximo</h1>
          <p>Tu curso "${courseData.title}" comienza en ${daysUntil} días.</p>
          <p><strong>Fecha:</strong> ${new Date(courseData.selectedDate).toLocaleDateString('es-MX')}</p>
          <p><strong>Enlace Zoom:</strong> <a href="${courseData.zoomLink}">${courseData.zoomLink}</a></p>
          <p><strong>ID de la reunión:</strong> ${courseData.zoomMeetingId}</p>
          <p><strong>Contraseña:</strong> ${courseData.zoomPassword}</p>
        `,
      });
      
      this.logEmailResult(info);
      return info;
    } catch (error) {
      console.error(`Failed to send reminder email to ${email}:`, error);
      throw error;
    }
  }

  async sendCertificateEmail(email: string, userData: any, courseData: any, certificateUrl: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Academia Uniprotec" <${this.configService.get('EMAIL_FROM') || 'noreply@academia-uniprotec.com'}>`,
        to: email,
        subject: `Tu certificado para ${courseData.title}`,
        html: `
          <h1>¡Felicidades ${userData.fullName}!</h1>
          <p>Has completado exitosamente el curso "${courseData.title}".</p>
          <p>Puedes acceder a tu certificado en el siguiente enlace:</p>
          <p><a href="${certificateUrl}">Descargar Certificado</a></p>
        `,
      });
      
      this.logEmailResult(info);
      return info;
    } catch (error) {
      console.error(`Failed to send certificate email to ${email}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmailCopilot(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Password Reset Request',
      text: `Click the link to reset your password: ${resetUrl}`,
      html: `<p>Click the link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully');
    } catch (error) {
      console.error('Failed to send password reset email:', error.message);
      throw new Error('Unable to send password reset email');
    }
  }

  async sendPasswordResetEmail(to: string, data: { userName: string; resetLink: string }): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"Academia Uniprotec" <${this.configService.get('EMAIL_FROM') || 'noreply@academia-uniprotec.com'}>`,
        to,
        subject: 'Recuperación de Contraseña - Academia Uniprotec',
        html: `
          <h1>Recuperación de Contraseña</h1>
          <p>Hola ${data.userName},</p>
          <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
          <p>Por favor, haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <p><a href="${data.resetLink}" style="padding: 10px 15px; background-color: #0066b3; color: white; text-decoration: none; border-radius: 4px;">Restablecer Contraseña</a></p>
          <p>Este enlace es válido por 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
          <p>${data.resetLink}</p>
          <p>Saludos,<br>El equipo de Academia Uniprotec</p>
        `,
      });
      
      this.logEmailResult(info);
    } catch (error) {
      console.error(`Failed to send password reset email to ${to}:`, error);
      throw error;
    }
  }

  private logEmailResult(info: any) {
    if (process.env.NODE_ENV !== 'production' && this.configService.get('USE_ETHEREAL') === 'true') {
      console.log('Email sent: %s', info.messageId);
      // Preview URL only available when sending through Ethereal
      console.log(info);
      if (info.preview) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
    }
  }
}