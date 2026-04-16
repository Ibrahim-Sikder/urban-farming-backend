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

export interface AuthResponse {
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
        status?: string;
    };
}

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

export interface ForgotPasswordInput {
    email: string;
}

export interface ResetPasswordInput {
    token: string;
    newPassword: string;
}