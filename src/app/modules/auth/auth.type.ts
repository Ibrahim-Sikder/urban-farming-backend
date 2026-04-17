import { UserStatus, Role, CertificationStatus } from '@prisma/client';
import { PaginationParams } from '../../shared/types/common.types';

// ============ INPUT TYPES ============
export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    role?: Role;
    phoneNumber?: string;
    address?: string;
    farmName?: string;
    farmLocation?: string;
    documents?: string[];
    ipAddress?: string;
    userAgent?: string;
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

export interface RefreshTokenInput {
    refreshToken: string;
}

export interface ForgotPasswordInput {
    email: string;
}

export interface ResetPasswordInput {
    token: string;
    newPassword: string;
}

export interface UpdateUserStatusInput {
    status: UserStatus;
}

export interface UserFilters extends PaginationParams {
    role?: string;
    status?: string;
    search?: string;
}

// ============ RESPONSE TYPES ============
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: Role;
        status: UserStatus;
        phoneNumber?: string;
        address?: string;
        profileImage?: string;
        vendorProfile?: {
            id: number;
            farmName: string;
            certificationStatus: CertificationStatus;
            farmLocation: string;
        };
    };
}

export interface TokenResponse {
    accessToken: string;
    refreshToken?: string;
    expiresIn: string;
}

export interface MessageResponse {
    message: string;
}

export interface PaginatedUsersResponse {
    users: Array<{
        id: number;
        name: string;
        email: string;
        role: Role;
        status: UserStatus;
        phoneNumber?: string;
        createdAt: Date;
        vendorProfile?: {
            farmName: string;
            certificationStatus: CertificationStatus;
            farmLocation: string;
        };
    }>;
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

// Re-export common types
export { PaginatedResponse } from '../../shared/types/common.types';