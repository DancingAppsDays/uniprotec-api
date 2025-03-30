// src/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userData: any): Promise<User> {
    const { email, password, ...rest } = userData;
    
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    
    // Hash password if provided
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    
    const user = new this.userModel({
      email,
      passwordHash,
      ...rest,
    });
    
    return user.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.passwordHash) {
      return null;
    }
  
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    return isPasswordValid ? user : null;
  }

  async findOrCreateUser(userData: any): Promise<User> {
    const { email } = userData;
    
    // Try to find existing user
    let user = await this.findByEmail(email);
    
    // If user doesn't exist, create one
    if (!user) {
      user = await this.create(userData);
    }
    
    return user;
  }
}