// src/users/users.controller.ts
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}