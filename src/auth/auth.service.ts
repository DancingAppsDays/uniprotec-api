// src/auth/auth.service.ts
import { OAuth2Client } from 'google-auth-library';

// In the AuthService class


import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  googleClient: OAuth2Client;
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService, 
  )  {
    // Initialize Google client
      // Initialize Google client
  const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
  console.log("Initializing Google client with ID:", clientId);
  this.googleClient = new OAuth2Client(clientId);
    console.log(this.googleClient)
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.validateUser(email, password);
    if (user) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      },
    };
  }

  async validateGoogleToken(token: string): Promise<any> {
    console.log("about to validetagoogletoken")
    console.log("token"+token)
    try {
      // Verify the Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID')
      });
      
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }
      
      // Extract user info from the Google payload
      const userData = {
        email: payload.email,
        fullName: payload.name,
        googleId: payload.sub,
        isEmailVerified: payload.email_verified
      };
      
      // Find or create user
      return this.findOrCreateUserFromGoogle(userData);
    } catch (error) {
      throw new UnauthorizedException('Failed to validate Google token');
    }
  }

  async findOrCreateUserFromGoogle(userData: any): Promise<any> {
    // Find or create user based on email
    const user = await this.usersService.findOrCreateUser({
      email: userData.email,
      fullName: userData.fullName,
      // Don't set password for Google users
    });
    
    // Return user and token
    return {
      token: this.jwtService.sign({ email: user.email, sub: user._id }),
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      },
    };
  }
}
