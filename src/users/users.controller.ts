// src/users/users.controller.ts
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() userData: any) {
    const user = await this.usersService.create(userData);
    return { 
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      },
      message: 'Registration successful' 
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }


  @Post('password-reset/request')
async requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
  return this.usersService.requestPasswordReset(requestDto.email);
}

@Post('password-reset/validate')
async validateResetToken(@Body() { token }: { token: string }) {
  return this.usersService.validateResetToken(token);
}

@Post('password-reset/reset')
async resetPassword(@Body() resetDto: ResetPasswordDto) {
  return this.usersService.resetPassword(resetDto.token, resetDto.newPassword);
}

@Post('password/update')
@UseGuards(JwtAuthGuard)
async updatePassword(@Request() req, @Body() updateDto: UpdatePasswordDto) {
  return this.usersService.updatePassword(
    req.user.userId, 
    updateDto.currentPassword, 
    updateDto.newPassword
  );
}
}