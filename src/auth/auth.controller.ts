// src/auth/auth.controller.ts
import { Controller, Request, Post, UseGuards, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);

    if (!user) {
      return { message: 'Invalid credentials' };
    }
    return this.authService.login(user);
  }



  @Get('google')
@UseGuards(AuthGuard('google'))
googleAuth() {
  // This triggers Google OAuth flow
}

@Get('google/callback')
@UseGuards(AuthGuard('google'))
googleAuthCallback(@Request() req) {
  // After Google auth success
  return req.user;
}

@Post('google/token')
async googleTokenLogin(@Body() body: { token: string }) {
  console.log('Received Google token verification request');
  try {
    const result = await this.authService.validateGoogleToken(body.token);
    console.log('Google token verification successful');
    return result;
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw error;
  }
}
}