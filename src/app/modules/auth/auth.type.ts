import { UserStatus } from '@prisma/client';

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    role?: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
    phoneNumber?: string;
    address?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

export interface UpdateProfileInput {
    name?: string;
    phoneNumber?: string;
    address?: string;
    profileImage?: string;
}