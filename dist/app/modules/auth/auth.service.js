"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const config_1 = require("../../config");
const client_1 = require("@prisma/client");
class AuthService {
    static async register(data) {
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email: data.email },
            select: { id: true }
        });
        if (existingUser) {
            throw new Error('User already exists with this email');
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, config_1.config.bcrypt.saltRounds);
        const user = await prisma_1.default.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role || client_1.Role.CUSTOMER,
                phoneNumber: data.phoneNumber,
                address: data.address,
                status: client_1.UserStatus.ACTIVE,
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
        if (data.role === client_1.Role.VENDOR) {
            await prisma_1.default.vendorProfile.create({
                data: {
                    userId: user.id,
                    farmName: data.farmName || '',
                    farmLocation: data.farmLocation || '',
                    certificationStatus: client_1.CertificationStatus.PENDING,
                },
            });
        }
        await prisma_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: 'REGISTER',
                entity: 'User',
                entityId: user.id,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });
        await redis_cache_service_1.default.delPattern('auth:users:*');
        return user;
    }
    static async login(data, ipAddress, userAgent) {
        const user = await prisma_1.default.user.findUnique({
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
        const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.password);
        if (!isPasswordValid) {
            await prisma_1.default.auditLog.create({
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
        if (user.status !== client_1.UserStatus.ACTIVE) {
            throw new Error('Account is inactive. Please contact support.');
        }
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.accessTokenExpiresIn });
        const refreshToken = crypto_1.default.randomBytes(40).toString('hex');
        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
        await prisma_1.default.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: refreshTokenExpiry,
            },
        });
        await prisma_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN_SUCCESS',
                entity: 'User',
                entityId: user.id,
                ipAddress: ipAddress,
                userAgent: userAgent,
            },
        });
        await redis_cache_service_1.default.setFast(`auth:profile:${user.id}`, user, 300);
        return {
            accessToken,
            refreshToken,
            expiresIn: config_1.config.jwt.accessTokenExpiresIn,
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
    static async refreshToken(refreshToken) {
        const token = await prisma_1.default.refreshToken.findFirst({
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
        const newAccessToken = jsonwebtoken_1.default.sign({ id: token.user.id, email: token.user.email, role: token.user.role }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.accessTokenExpiresIn });
        const newRefreshToken = crypto_1.default.randomBytes(40).toString('hex');
        const newRefreshTokenExpiry = new Date();
        newRefreshTokenExpiry.setDate(newRefreshTokenExpiry.getDate() + 7);
        await prisma_1.default.$transaction([
            prisma_1.default.refreshToken.update({
                where: { id: token.id },
                data: { revoked: true },
            }),
            prisma_1.default.refreshToken.create({
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
            expiresIn: config_1.config.jwt.accessTokenExpiresIn,
        };
    }
    static async logout(userId, refreshToken) {
        if (refreshToken) {
            await prisma_1.default.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { revoked: true },
            });
        }
        await prisma_1.default.auditLog.create({
            data: {
                userId: userId,
                action: 'LOGOUT',
                entity: 'User',
                entityId: userId,
            },
        });
        await redis_cache_service_1.default.del(`auth:profile:${userId}`);
        return { message: 'Logged out successfully' };
    }
    static async logoutAll(userId) {
        await prisma_1.default.refreshToken.updateMany({
            where: { userId: userId, revoked: false },
            data: { revoked: true },
        });
        await redis_cache_service_1.default.del(`auth:profile:${userId}`);
        return { message: 'Logged out from all devices' };
    }
    static async changePassword(userId, data) {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(data.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.newPassword, config_1.config.bcrypt.saltRounds);
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        await prisma_1.default.refreshToken.updateMany({
            where: { userId: userId, revoked: false },
            data: { revoked: true },
        });
        await prisma_1.default.auditLog.create({
            data: {
                userId: userId,
                action: 'CHANGE_PASSWORD',
                entity: 'User',
                entityId: userId,
            },
        });
        await redis_cache_service_1.default.del(`auth:profile:${userId}`);
        return { message: 'Password changed successfully' };
    }
    static async forgotPassword(email, ipAddress) {
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            select: { id: true, email: true }
        });
        if (user) {
            const resetToken = crypto_1.default.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            await prisma_1.default.passwordResetToken.create({
                data: {
                    email: email,
                    token: resetToken,
                    expiresAt: expiresAt,
                    userId: user.id,
                },
            });
            console.log(`Password reset token for ${email}: ${resetToken}`);
            console.log(`Reset link: ${config_1.config.appUrl}/reset-password?token=${resetToken}`);
        }
        return { message: 'If email exists, reset link will be sent' };
    }
    static async resetPassword(token, newPassword, ipAddress) {
        const resetToken = await prisma_1.default.passwordResetToken.findFirst({
            where: {
                token: token,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });
        if (!resetToken) {
            throw new Error('Invalid or expired reset token');
        }
        const user = await prisma_1.default.user.findUnique({
            where: { email: resetToken.email },
            select: { id: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, config_1.config.bcrypt.saltRounds);
        await prisma_1.default.$transaction([
            prisma_1.default.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            }),
            prisma_1.default.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
            prisma_1.default.refreshToken.updateMany({
                where: { userId: user.id, revoked: false },
                data: { revoked: true },
            }),
        ]);
        await prisma_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: 'RESET_PASSWORD',
                entity: 'User',
                entityId: user.id,
                ipAddress: ipAddress,
            },
        });
        await redis_cache_service_1.default.del(`auth:profile:${user.id}`);
        return { message: 'Password reset successfully' };
    }
    static async getProfile(userId) {
        const cacheKey = `auth:profile:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: {
                vendorProfile: {
                    include: {
                        produce: {
                            take: 5,
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                category: true,
                                availableQuantity: true,
                            }
                        },
                        rentalSpaces: {
                            where: { availability: true },
                            take: 5,
                            select: {
                                id: true,
                                location: true,
                                size: true,
                                price: true,
                            }
                        },
                        sustainabilityCert: true,
                    },
                },
                orders: {
                    take: 10,
                    orderBy: { orderDate: 'desc' },
                    include: {
                        produce: {
                            select: { name: true, price: true }
                        },
                    },
                },
                communityPosts: {
                    take: 5,
                    orderBy: { postDate: 'desc' },
                    select: {
                        id: true,
                        postContent: true,
                        postDate: true,
                    }
                },
                plantTrackings: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        plantName: true,
                        healthStatus: true,
                        growthStage: true,
                    }
                },
                notifications: {
                    where: { isRead: false },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        message: true,
                        type: true,
                        createdAt: true,
                    }
                },
            },
        });
        if (!user) {
            throw new Error('User not found');
        }
        await redis_cache_service_1.default.setFast(cacheKey, user, 300);
        return user;
    }
    static async updateProfile(userId, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.phoneNumber !== undefined)
            updateData.phoneNumber = data.phoneNumber;
        if (data.address !== undefined)
            updateData.address = data.address;
        if (data.profileImage !== undefined)
            updateData.profileImage = data.profileImage;
        const user = await prisma_1.default.user.update({
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
        await redis_cache_service_1.default.del(`auth:profile:${userId}`);
        return user;
    }
    static async getAllUsers(page = 1, limit = 10, filters) {
        const cacheKey = `auth:users:${page}:${limit}:${JSON.stringify(filters)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.role)
            where.role = filters.role;
        if (filters?.status)
            where.status = filters.status;
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            prisma_1.default.user.findMany({
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
            prisma_1.default.user.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        const response = {
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
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async updateUserStatus(userId, status, adminId) {
        const user = await prisma_1.default.user.update({
            where: { id: userId },
            data: { status: status },
            select: { id: true, name: true, email: true, status: true },
        });
        await prisma_1.default.notification.create({
            data: {
                userId: userId,
                title: 'Account Status Updated',
                message: `Your account has been ${status.toLowerCase()}`,
                type: 'SYSTEM',
            },
        });
        await Promise.all([
            redis_cache_service_1.default.del(`auth:profile:${userId}`),
            redis_cache_service_1.default.delPattern('auth:users:*'),
        ]);
        return user;
    }
    static async deleteUser(userId, adminId) {
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                status: client_1.UserStatus.INACTIVE,
                deletedAt: new Date()
            },
        });
        await Promise.all([
            redis_cache_service_1.default.del(`auth:profile:${userId}`),
            redis_cache_service_1.default.delPattern('auth:users:*'),
        ]);
        return { message: 'User deleted successfully' };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map