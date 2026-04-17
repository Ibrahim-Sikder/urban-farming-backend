
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import { config } from '../../config';
import { UserStatus, Role, CertificationStatus } from '@prisma/client';
import {
    RegisterInput,
    LoginInput,
    ChangePasswordInput,
    UpdateProfileInput,
    AuthResponse,
    TokenResponse,
    MessageResponse,
    PaginatedUsersResponse,
    UserFilters
} from './auth.type';
import { EmailService } from '../../services/email.service';

export class AuthService {


    static async register(data: RegisterInput): Promise<any> {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
            select: { id: true }
        });

        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        const hashedPassword = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role || Role.CUSTOMER,
                phoneNumber: data.phoneNumber,
                address: data.address,
                status: UserStatus.ACTIVE,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                phoneNumber: true,
                address: true,
                profileImage: true,
                createdAt: true,
            },
        });

        if (data.role === Role.VENDOR) {
            await prisma.vendorProfile.create({
                data: {
                    userId: user.id,
                    farmName: data.farmName || '',
                    farmLocation: data.farmLocation || '',
                    certificationStatus: CertificationStatus.PENDING,
                },
            });
        }

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'REGISTER',
                entity: 'User',
                entityId: user.id,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });

        // Clear user list cache
        await RedisCacheService.delPattern('auth:users:*');

        return user;
    }


    static async login(data: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
        const user = await prisma.user.findUnique({
            where: { email: data.email },
            include: {
                vendorProfile: {
                    select: {
                        id: true,
                        farmName: true,
                        certificationStatus: true,
                        farmLocation: true,
                    },
                },
            },
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            await prisma.auditLog.create({
                data: {
                    email: data.email,
                    action: 'LOGIN_FAILED',
                    entity: 'User',
                    ipAddress: ipAddress,
                    userAgent: userAgent,
                },
            });
            throw new Error('Invalid credentials');
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new Error('Account is inactive. Please contact support.');
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.accessTokenExpiresIn as jwt.SignOptions['expiresIn'] }
        );

        const refreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: refreshTokenExpiry,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN_SUCCESS',
                entity: 'User',
                entityId: user.id,
                ipAddress: ipAddress,
                userAgent: userAgent,
            },
        });

        await RedisCacheService.setFast(`auth:profile:${user.id}`, user, 300);

        return {
            accessToken,
            refreshToken,
            expiresIn: config.jwt.accessTokenExpiresIn,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                phoneNumber: user.phoneNumber || undefined,
                address: user.address || undefined,
                profileImage: user.profileImage || undefined,
                vendorProfile: user.vendorProfile ? {
                    id: user.vendorProfile.id,
                    farmName: user.vendorProfile.farmName,
                    certificationStatus: user.vendorProfile.certificationStatus,
                    farmLocation: user.vendorProfile.farmLocation,
                } : undefined,
            },
        };
    }

    static async updateProfile(userId: number, data: UpdateProfileInput) {

        const updateData: any = {};

        if (data.name !== undefined && data.name !== null) {
            updateData.name = data.name;
        }
        if (data.phoneNumber !== undefined && data.phoneNumber !== null) {
            updateData.phoneNumber = data.phoneNumber;

        }
        if (data.address !== undefined && data.address !== null) {
            updateData.address = data.address;

        }
        if (data.profileImage !== undefined && data.profileImage !== null) {
            updateData.profileImage = data.profileImage;

        }


        if (Object.keys(updateData).length === 0) {
            throw new Error('No valid fields provided for update');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                address: true,
                profileImage: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        await RedisCacheService.del(`auth:profile:${userId}`);

        await RedisCacheService.delPattern(`auth:profile:${userId}:*`);


        return updatedUser;
    }


    static async getProfile(userId: number): Promise<any> {
        const cacheKey = `auth:profile:${userId}`;

        // Try cache
        const cached = await RedisCacheService.getFast<any>(cacheKey);
        if (cached) {
            console.log('📦 Returning cached profile for user:', userId);
            return cached;
        }

        console.log('🔍 Fetching fresh profile for user:', userId);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                phoneNumber: true,
                address: true,
                profileImage: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Cache for 5 minutes
        await RedisCacheService.setFast(cacheKey, user, 300);

        return user;
    }


    static async refreshToken(refreshToken: string): Promise<TokenResponse> {
        const token = await prisma.refreshToken.findFirst({
            where: {
                token: refreshToken,
                revoked: false,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });

        if (!token) {
            throw new Error('Invalid or expired refresh token');
        }

        const newAccessToken = jwt.sign(
            { id: token.user.id, email: token.user.email, role: token.user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.accessTokenExpiresIn as jwt.SignOptions['expiresIn'] }
        );

        const newRefreshToken = crypto.randomBytes(40).toString('hex');
        const newRefreshTokenExpiry = new Date();
        newRefreshTokenExpiry.setDate(newRefreshTokenExpiry.getDate() + 7);

        await prisma.$transaction([
            prisma.refreshToken.update({
                where: { id: token.id },
                data: { revoked: true },
            }),
            prisma.refreshToken.create({
                data: {
                    token: newRefreshToken,
                    userId: token.user.id,
                    expiresAt: newRefreshTokenExpiry,
                },
            }),
        ]);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: config.jwt.accessTokenExpiresIn,
        };
    }
    static async logout(userId: number, refreshToken?: string): Promise<MessageResponse> {
        if (refreshToken) {
            await prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { revoked: true },
            });
        }

        await prisma.auditLog.create({
            data: {
                userId: userId,
                action: 'LOGOUT',
                entity: 'User',
                entityId: userId,
            },
        });

        await RedisCacheService.del(`auth:profile:${userId}`);

        return { message: 'Logged out successfully' };
    }


    static async logoutAll(userId: number): Promise<MessageResponse> {
        await prisma.refreshToken.updateMany({
            where: { userId: userId, revoked: false },
            data: { revoked: true },
        });

        await RedisCacheService.del(`auth:profile:${userId}`);

        return { message: 'Logged out from all devices' };
    }


    static async changePassword(userId: number, data: ChangePasswordInput): Promise<MessageResponse> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(data.newPassword, config.bcrypt.saltRounds);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        await prisma.refreshToken.updateMany({
            where: { userId: userId, revoked: false },
            data: { revoked: true },
        });

        await prisma.auditLog.create({
            data: {
                userId: userId,
                action: 'CHANGE_PASSWORD',
                entity: 'User',
                entityId: userId,
            },
        });

        await RedisCacheService.del(`auth:profile:${userId}`);

        return { message: 'Password changed successfully' };
    }

    static async forgotPassword(email: string, ipAddress?: string): Promise<MessageResponse> {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true }
        });

        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return { message: 'If email exists, reset link will be sent' };
        }

        const existingToken = await prisma.passwordResetToken.findFirst({
            where: {
                email: email,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        let resetToken: string;
        let expiresAt: Date;

        if (existingToken) {
            resetToken = existingToken.token;
            expiresAt = existingToken.expiresAt;
        } else {
            resetToken = crypto.randomBytes(32).toString('hex');
            expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);

            await prisma.passwordResetToken.create({
                data: {
                    email: email,
                    token: resetToken,
                    expiresAt: expiresAt,
                    userId: user.id,
                },
            });
        }

        try {
            await EmailService.sendPasswordResetEmail(email, resetToken, user.name);
            console.log(`Password reset email sent to ${email} with token: ${resetToken}`);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            throw new Error('Unable to send password reset email. Please try again later.');
        }

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'FORGOT_PASSWORD',
                entity: 'User',
                entityId: user.id,
                ipAddress: ipAddress,
            },
        });

        return { message: 'Password reset link has been sent to your email address' };
    }

    static async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<MessageResponse> {
        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        const resetToken = await prisma.passwordResetToken.findFirst({
            where: {
                token: token,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!resetToken) {
            throw new Error('Invalid or expired reset token. Please request a new password reset.');
        }

        const user = await prisma.user.findUnique({
            where: { email: resetToken.email },
            select: { id: true, name: true, email: true, password: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new Error('New password cannot be the same as the old password');
        }

        const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
            prisma.refreshToken.updateMany({
                where: { userId: user.id, revoked: false },
                data: { revoked: true },
            }),
        ]);

        try {
            await EmailService.sendPasswordResetSuccessEmail(user.email, user.name);
        } catch (emailError) {
            console.error('Failed to send password reset success email:', emailError);
        }

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'RESET_PASSWORD',
                entity: 'User',
                entityId: user.id,
                ipAddress: ipAddress,
            },
        });

        await RedisCacheService.del(`auth:profile:${user.id}`);

        return { message: 'Password has been reset successfully. You can now login with your new password.' };
    }
    static async getAllUsers(page: number = 1, limit: number = 10, filters?: UserFilters): Promise<PaginatedUsersResponse> {
        const cacheKey = `auth:users:${page}:${limit}:${JSON.stringify(filters)}`;

        const cached = await RedisCacheService.getFast<PaginatedUsersResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const skip = (page - 1) * limit;
        const where: any = {};

        if (filters?.role) where.role = filters.role;
        if (filters?.status) where.status = filters.status;
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
                take: limit,
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
                            farmLocation: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        const response: PaginatedUsersResponse = {
            users,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }


    static async updateUserStatus(userId: number, status: UserStatus, adminId: number) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { status: status },
            select: { id: true, name: true, email: true, status: true },
        });

        await prisma.notification.create({
            data: {
                userId: userId,
                title: 'Account Status Updated',
                message: `Your account has been ${status.toLowerCase()}`,
                type: 'SYSTEM',
            },
        });

        await Promise.all([
            RedisCacheService.del(`auth:profile:${userId}`),
            RedisCacheService.delPattern('auth:users:*'),
        ]);

        return user;
    }
    static async deleteUser(userId: number, adminId: number): Promise<MessageResponse> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                status: UserStatus.INACTIVE,
                deletedAt: new Date()
            },
        });

        await Promise.all([
            RedisCacheService.del(`auth:profile:${userId}`),
            RedisCacheService.delPattern('auth:users:*'),
        ]);

        return { message: 'User deleted successfully' };
    }
}