// modules/vendor/vendor.type.ts
import { CertificationStatus, OrderStatus } from '@prisma/client';

// ============ INPUT TYPES ============
export interface UpdateVendorProfileInput {
    farmName?: string;
    farmLocation?: string;
}

export interface CreateProduceInput {
    name: string;
    description: string;
    price: number;
    category: string;
    availableQuantity: number;
}

export interface UpdateProduceInput {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    availableQuantity?: number;
}

export interface CreateRentalSpaceInput {
    location: string;
    size: number;
    price: number;
}

export interface UpdateRentalSpaceInput {
    location?: string;
    size?: number;
    price?: number;
    availability?: boolean;
}

export interface SubmitCertificationInput {
    certifyingAgency: string;
    certificationDate: Date;
    expiryDate?: Date;
    documentUrl?: string;
}

export interface UpdateOrderStatusInput {
    status: OrderStatus;
}

// ============ RESPONSE TYPES ============
export interface MessageResponse {
    message: string;
}