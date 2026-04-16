import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { config } from '../../config';

export class AuthService {
    static async register(data: {
        name: string;
        email: string;
        password: string;
        role?: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
        phoneNumber?: string;
    }) {
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
                role: data.role || 'CUSTOMER',
                phoneNumber: data.phoneNumber,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
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
                },
            });
        }

        return user;
    }

    static async login(data: { email: string; password: string }) {
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        if (user.status !== 'ACTIVE') {
            throw new Error('Account is inactive');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }
}