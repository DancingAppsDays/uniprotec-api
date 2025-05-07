// src/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { randomBytes } from 'crypto';
import { PasswordReset, PasswordResetDocument } from './schemas/password-reset.schema';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PasswordReset.name) private passwordResetModel: Model<PasswordResetDocument>,
    private emailService: EmailService,
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





  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findOne({ email }).exec();
    
    if (!user) {
      // Still return success to prevent email enumeration
      return {
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      };
    }
    
    // Generate a random token
    const token = randomBytes(32).toString('hex');
    
    // Set expiration for 1 hour from now
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);
    
    // Save the reset token
    await this.passwordResetModel.findOneAndUpdate(
      { user: user._id },
      { token, expires, used: false },
      { upsert: true, new: true }
    ).exec();
    
    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/#/reset-password?token=${token}`;
    
    // Send email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, {
        userName: user.fullName,
        resetLink
      });
      
      return {
        success: true,
        message: 'Password reset link has been sent to your email'
      };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Unable to send password reset email');
    }
  }
  
  async validateResetToken(token: string): Promise<{ valid: boolean }> {
    const resetRecord = await this.passwordResetModel.findOne({ 
      token,
      used: false,
      expires: { $gt: new Date() }
    }).exec();
    
    return { valid: !!resetRecord };
  }
  
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Find valid reset token
    const resetRecord = await this.passwordResetModel.findOne({
      token,
      used: false,
      expires: { $gt: new Date() }
    }).exec();
    
    if (!resetRecord) {
      throw new Error('Invalid or expired password reset token');
    }
    
    // Get user
    const user = await this.userModel.findById(resetRecord.user).exec();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update user's password
    user.passwordHash = passwordHash;
    await user.save();
    
    // Mark token as used
    resetRecord.used = true;
    await resetRecord.save();
    
    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  }
  
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const user = await this.userModel.findById(userId).exec();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash and update new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    return { success: true };
  }
  
}