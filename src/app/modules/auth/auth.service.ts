// modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/prisma';
import { config } from '../../config';
import { UserStatus, Role } from '@prisma/client';
import {
    RegisterInput,
    LoginInput,
    ChangePasswordInput,
    UpdateProfileInput,
    AuthResponse,
    TokenResponse,
    MessageResponse,
    UserProfileResponse,
    PaginatedUsersResponse
} from './auth.type';

export class AuthService {

    // ============ AUTHENTICATION OPERATIONS ============

    static async register(data: RegisterInput): Promise<Omit<RegisterInput, 'password'>> {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

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

        // Create vendor profile if role is VENDOR
        if (data.role === Role.VENDOR) {
            await prisma.vendorProfile.create({
                data: {
                    userId: user.id,
                    farmName: data.farmName || '',
                    farmLocation: data.farmLocation || '',
                    certificationStatus: 'PENDING',
                    approvalStatus: 'PENDING',
                },
            });

            await prisma.vendorApprovalRequest.create({
                data: {
                    vendorId: user.id,
                    status: 'PENDING',
                    documents: data.documents || [],
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
                        isVerified: true,
                        approvalStatus: true,
                    },
                },
            },
        });

        if (!user || user.deletedAt) {
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

        if (user.role === Role.VENDOR && user.vendorProfile?.approvalStatus !== 'APPROVED') {
            throw new Error('Your vendor account is pending approval. Please wait for admin verification.');
        }

        // Fix: Use proper JWT sign options with correct typing
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
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

        return {
            accessToken,
            refreshToken,
            expiresIn: '15m',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                phoneNumber: user.phoneNumber || undefined,
                address: user.address || undefined,
                profileImage: user.profileImage || undefined,
                vendorProfile: user.vendorProfile || undefined,
            },
        };
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

        // Fix: Use proper JWT sign options with correct typing
        const newAccessToken = jwt.sign(
            { id: token.user.id, email: token.user.email, role: token.user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
        );

        return {
            accessToken: newAccessToken,
            expiresIn: '15m',
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

        return { message: 'Logged out successfully' };
    }

    static async logoutAll(userId: number): Promise<MessageResponse> {
        await prisma.refreshToken.updateMany({
            where: { userId: userId, revoked: false },
            data: { revoked: true },
        });

        return { message: 'Logged out from all devices' };
    }

    // ============ PASSWORD MANAGEMENT ============

    static async changePassword(userId: number, data: ChangePasswordInput): Promise<MessageResponse> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(data.newPassword, 10);

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

        return { message: 'Password changed successfully' };
    }

    static async forgotPassword(email: string, ipAddress?: string): Promise<MessageResponse> {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);

            await prisma.passwordResetToken.create({
                data: {
                    email: email,
                    token: resetToken,
                    expiresAt: expiresAt,
                    userId: user.id,
                },
            });

            console.log(`Password reset token for ${email}: ${resetToken}`);

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'FORGOT_PASSWORD',
                    entity: 'User',
                    entityId: user.id,
                    ipAddress: ipAddress,
                },
            });
        }

        return { message: 'If email exists, reset link will be sent' };
    }

    static async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<MessageResponse> {
        const resetToken = await prisma.passwordResetToken.findFirst({
            where: {
                token: token,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!resetToken) {
            throw new Error('Invalid or expired reset token');
        }

        const user = await prisma.user.findUnique({
            where: { email: resetToken.email },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

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

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'RESET_PASSWORD',
                entity: 'User',
                entityId: user.id,
                ipAddress: ipAddress,
            },
        });

        return { message: 'Password reset successfully' };
    }

    // ============ PROFILE MANAGEMENT ============

    static async getProfile(userId: number): Promise<UserProfileResponse> {
        const user = await prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
            include: {
                vendorProfile: {
                    include: {
                        produce: {
                            take: 5,
                            orderBy: { createdAt: 'desc' },
                            where: { certificationStatus: 'APPROVED' },
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                images: true,
                                certificationStatus: true,
                            },
                        },
                        rentalSpaces: {
                            where: { availability: true, isApproved: true },
                            take: 5,
                            select: {
                                id: true,
                                name: true,
                                pricePerMonth: true,
                                location: true,
                                availability: true,
                            },
                        },
                        sustainabilityCert: true,
                        approvalRequests: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                },
                orders: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        produce: {
                            select: { name: true, images: true },
                        },
                    },
                },
                communityPosts: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    where: { isApproved: true },
                },
                plantTrackings: {
                    where: { healthStatus: { not: 'HARVEST_READY' } },
                },
                notifications: {
                    where: { isRead: false },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user as unknown as UserProfileResponse;
    }

    static async updateProfile(userId: number, data: UpdateProfileInput) {
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;

        const user = await prisma.user.update({
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
            },
        });

        const newValuesObject: Record<string, any> = {};
        if (data.name !== undefined) newValuesObject.name = data.name;
        if (data.phoneNumber !== undefined) newValuesObject.phoneNumber = data.phoneNumber;
        if (data.address !== undefined) newValuesObject.address = data.address;
        if (data.profileImage !== undefined) newValuesObject.profileImage = data.profileImage;

        await prisma.auditLog.create({
            data: {
                userId: userId,
                action: 'UPDATE_PROFILE',
                entity: 'User',
                entityId: userId,
                newValues: newValuesObject,
            },
        });

        return user;
    }

    // ============ ADMIN OPERATIONS ============

    static async getAllUsers(page: number = 1, limit: number = 10, filters?: {
        role?: string;
        status?: string;
        search?: string;
    }): Promise<PaginatedUsersResponse> {
        const skip = (page - 1) * limit;
        const take = limit;
        const where: any = { deletedAt: null };

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
                            approvalStatus: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    static async updateUserStatus(userId: number, status: UserStatus, adminId: number) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { status: status },
            select: { id: true, name: true, email: true, status: true },
        });

        await prisma.auditLog.create({
            data: {
                userId: adminId,
                action: 'UPDATE_USER_STATUS',
                entity: 'User',
                entityId: userId,
                newValues: { status: status },
            },
        });

        await prisma.notification.create({
            data: {
                userId: userId,
                title: 'Account Status Updated',
                message: `Your account has been ${status.toLowerCase()}`,
                type: 'SYSTEM',
            },
        });

        return user;
    }

    static async deleteUser(userId: number, adminId: number): Promise<MessageResponse> {
        await prisma.user.update({
            where: { id: userId },
            data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
        });

        await prisma.auditLog.create({
            data: {
                userId: adminId,
                action: 'DELETE_USER',
                entity: 'User',
                entityId: userId,
            },
        });

        return { message: 'User deleted successfully' };
    }
}