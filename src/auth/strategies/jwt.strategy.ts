import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'unsecure-secret-change-me',
    });
  }

  async validate(payload: any) {
   // console.log('JWT Strategy validate called with payload:', payload);
    
    const user = { 
      userId: payload.sub, 
      email: payload.email,
      roles: payload.roles || []
    };
    
    //console.log('JWT Strategy returning user:', user);
    return user;
  }
}