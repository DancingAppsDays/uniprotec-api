// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      // Configure your email provider here
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: this.configService.get('EMAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    });
  }

  async sendCourseAccessEmail(to: string, courseData: any) {
    await this.transporter.sendMail({
      from: `"Academia Uniprotec" <${this.configService.get('EMAIL_FROM')}>`,
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
  }
}