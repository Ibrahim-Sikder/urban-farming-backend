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
const config_1 = require("../../config");
class AuthService {
    static async register(data) {
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new Error('User already exists with this email');
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
        const user = await prisma_1.default.user.create({
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
        if (data.role === 'VENDOR') {
            await prisma_1.default.vendorProfile.create({
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
    static async login(data) {
        const user = await prisma_1.default.user.findUnique({
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
        const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }
        if (user.status !== 'ACTIVE') {
            throw new Error('Account is inactive. Please contact support.');
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role
        }, config_1.config.jwt.secret, {
            expiresIn: config_1.config.jwt.expiresIn
        });
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
    static async getProfile(userId) {
        const user = await prisma_1.default.user.findUnique({
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
    static async updateProfile(userId, data) {
        const user = await prisma_1.default.user.update({
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
    static async changePassword(userId, data) {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(data.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.newPassword, 10);
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return { message: 'Password changed successfully' };
    }
    static async forgotPassword(email) {
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            return { message: 'If email exists, reset link will be sent' };
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        console.log(`Password reset token for ${email}: ${resetToken}`);
        return { message: 'If email exists, reset link will be sent' };
    }
    static async resetPassword(token, newPassword) {
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        return { message: 'Password reset successfully' };
    }
    static async getAllUsers(page = 1, limit = 10, filters) {
        const skip = (page - 1) * limit;
        const take = limit;
        const where = {};
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
            prisma_1.default.user.findMany({
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
            prisma_1.default.user.count({ where }),
        ]);
        return { users, total, page, limit };
    }
    static async updateUserStatus(userId, status) {
        const user = await prisma_1.default.user.update({
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
    static async deleteUser(userId) {
        await prisma_1.default.user.delete({
            where: { id: userId },
        });
        return { message: 'User deleted successfully' };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map