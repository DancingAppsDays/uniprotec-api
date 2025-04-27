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
  // const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
  // console.log("Initializing Google client with ID:", clientId);
  // this.googleClient = new OAuth2Client(clientId);
  //   console.log(this.googleClient)
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
 // console.log('User object in login:', user);
  
  // Access the actual document data
  const userData = user._doc || user;
  //console.log('User roles:', userData.roles);
  
  const payload = { 
    email: userData.email, 
    sub: userData._id.toString(), // Convert ObjectId to string
    roles: userData.roles || []
  };
  
  //console.log('JWT payload being signed:', payload);
  
  const token = this.jwtService.sign(payload);
  
  // Verify what's actually in the token
  const decoded = this.jwtService.decode(token);
 // console.log('Decoded JWT token:', decoded);
  
  return {
    token,
    user: {
      id: userData._id,
      email: userData.email,
      fullName: userData.fullName,
      phone: userData.phone,
      roles: userData.roles || []
    },
  };
}


  async loginLEGACY(user: any) {
    console.log('User object in login:', user); // Add this
    console.log('User roles:', user.roles); // Add this
    
    const payload = { email: user.email, sub: user._id };

    // Make sure we're working with the document data
    const userData = user._doc || user;

    

    console.log('Login response:', {
      token: this.jwtService.sign(payload),
      user: {
        id: userData._id,
        email: userData.email,
        fullName: userData.fullName,
        phone: userData.phone,
        roles: userData.roles || []
      },
    });


    
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: userData._id,
        email: userData.email,
        fullName: userData.fullName,
        phone: userData.phone,
        roles: userData.roles || []
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
