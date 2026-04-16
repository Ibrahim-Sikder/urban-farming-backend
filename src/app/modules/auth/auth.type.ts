// modules/auth/auth.type.ts
import { UserStatus, Role } from '@prisma/client';

// ============ INPUT TYPES ============
export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    role?: Role;
    phoneNumber?: string;
    address?: string;
    farmName?: string;        // Required if role is VENDOR
    farmLocation?: string;    // Required if role is VENDOR
    documents?: string[];     // Required if role is VENDOR
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

export interface UserFilters {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
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
            certificationStatus: string;
            isVerified: boolean;
            approvalStatus: string;
        };
    };
}

export interface TokenResponse {
    accessToken: string;
    expiresIn: string;
}

export interface MessageResponse {
    message: string;
}

export interface UserProfileResponse {
    id: number;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    phoneNumber?: string;
    address?: string;
    profileImage?: string;
    createdAt: Date;
    updatedAt: Date;
    vendorProfile?: {
        id: number;
        farmName: string;
        farmDescription?: string;
        farmLocation: string;
        certificationStatus: string;
        totalRating: number;
        ratingCount: number;
        isVerified: boolean;
        approvalStatus: string;
        produce: Array<{
            id: number;
            name: string;
            price: number;
            images: string[];
            certificationStatus: string;
        }>;
        rentalSpaces: Array<{
            id: number;
            name: string;
            pricePerMonth: number;
            location: string;
            availability: boolean;
        }>;
        sustainabilityCert?: {
            id: number;
            certifyingAgency: string;
            certificateNumber: string;
            expiryDate: Date;
        };
        approvalRequests: Array<{
            id: number;
            status: string;
            comments?: string;
            createdAt: Date;
        }>;
    };
    orders: Array<{
        id: number;
        totalPrice: number;
        status: string;
        createdAt: Date;
        produce: {
            name: string;
            images: string[];
        };
    }>;
    communityPosts: Array<{
        id: number;
        title: string;
        content: string;
        likes: number;
        createdAt: Date;
    }>;
    plantTrackings: Array<{
        id: number;
        plantName: string;
        healthStatus: string;
        growthStage: string;
        expectedHarvestDate: Date;
    }>;
    notifications: Array<{
        id: number;
        title: string;
        message: string;
        type: string;
        isRead: boolean;
        createdAt: Date;
    }>;
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
            certificationStatus: string;
            isVerified: boolean;
            approvalStatus: string;
        };
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}