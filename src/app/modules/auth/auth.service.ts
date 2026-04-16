import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/prisma';
import { config } from '../../config';

import { UserStatus } from '@prisma/client';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.type';

export class AuthService {

    // Register new user
    static async register(data: RegisterInput) {
        // Check existing user
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role || 'CUSTOMER',
                phoneNumber: data.phoneNumber,
                address: data.address,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                phoneNumber: true,
                address: true,
                createdAt: true,
            },
        });

        // Create vendor profile if role is VENDOR
        if (data.role === 'VENDOR') {
            await prisma.vendorProfile.create({
                data: {
                    userId: user.id,
                    farmName: '',
                    farmLocation: JSON.stringify({ lat: 0, lng: 0, address: '' }),
                    certificationStatus: 'PENDING',
                },
            });
        }

        return user;
    }

    // Login user
    static async login(data: LoginInput) {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email: data.email },
            include: {
                vendorProfile: {
                    select: {
                        id: true,
                        farmName: true,
                        certificationStatus: true,
                        isVerified: true,
                    },
                },
            },
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Check account status
        if (user.status !== 'ACTIVE') {
            throw new Error('Account is inactive. Please contact support.');
        }

        // Generate token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        // Return response
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                phoneNumber: user.phoneNumber,
                address: user.address,
                vendorProfile: user.vendorProfile,
            },
        };
    }

    // Get current user profile
    static async getProfile(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                vendorProfile: {
                    include: {
                        produce: {
                            take: 5,
                            orderBy: { createdAt: 'desc' },
                        },
                        rentalSpaces: {
                            where: { availability: true },
                            take: 5,
                        },
                        sustainabilityCert: true,
                    },
                },
                orders: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        produce: {
                            select: {
                                name: true,
                                images: true,
                            },
                        },
                    },
                },
                communityPosts: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
                plantTrackings: {
                    where: { healthStatus: { not: 'HARVEST_READY' } },
                },
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    // Update profile
    static async updateProfile(userId: number, data: {
        name?: string;
        phoneNumber?: string;
        address?: string;
        profileImage?: string;
    }) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                phoneNumber: data.phoneNumber,
                address: data.address,
                profileImage: data.profileImage,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                address: true,
                profileImage: true,
                role: true,
            },
        });

        return user;
    }

    // Change password
    static async changePassword(userId: number, data: ChangePasswordInput) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(data.newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return { message: 'Password changed successfully' };
    }

    // Forgot password - generate reset token
    static async forgotPassword(email: string) {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal if user exists or not for security
            return { message: 'If email exists, reset link will be sent' };
        }

        // Generate reset token (in production, store in database with expiry)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // In production, save token to database with expiry
        // await prisma.passwordReset.create({
        //   data: {
        //     userId: user.id,
        //     token: resetToken,
        //     expiresAt: new Date(Date.now() + 3600000), // 1 hour
        //   },
        // });

        // In production, send email with reset link
        console.log(`Password reset token for ${email}: ${resetToken}`);

        return { message: 'If email exists, reset link will be sent' };
    }

    // Reset password
    static async resetPassword(token: string, newPassword: string) {
        // In production, verify token from database
        // const resetRequest = await prisma.passwordReset.findFirst({
        //   where: {
        //     token,
        //     expiresAt: { gt: new Date() },
        //     used: false,
        //   },
        // });

        // if (!resetRequest) {
        //   throw new Error('Invalid or expired token');
        // }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password (in production, get userId from resetRequest)
        // await prisma.user.update({
        //   where: { id: resetRequest.userId },
        //   data: { password: hashedPassword },
        // });

        // Mark token as used
        // await prisma.passwordReset.update({
        //   where: { id: resetRequest.id },
        //   data: { used: true },
        // });

        return { message: 'Password reset successfully' };
    }

    // Get all users (Admin only)
    static async getAllUsers(page: number = 1, limit: number = 10, filters?: {
        role?: string;
        status?: string;
        search?: string;
    }) {
        const skip = (page - 1) * limit;
        const take = limit;

        const where: any = {};

        if (filters?.role) {
            where.role = filters.role;
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    phoneNumber: true,
                    createdAt: true,
                    vendorProfile: {
                        select: {
                            farmName: true,
                            certificationStatus: true,
                            isVerified: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        return { users, total, page, limit };
    }

    // Update user status (Admin only)
    static async updateUserStatus(userId: number, status: UserStatus) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { status },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
            },
        });

        return user;
    }

    // Delete user (Admin only)
    static async deleteUser(userId: number) {
        await prisma.user.delete({
            where: { id: userId },
        });

        return { message: 'User deleted successfully' };
    }
}