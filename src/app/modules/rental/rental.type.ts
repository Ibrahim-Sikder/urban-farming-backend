// modules/rental/rental.type.ts
import { OrderStatus } from '@prisma/client';

// ============ INPUT TYPES ============
export interface CreateRentalBookingInput {
    spaceId: number;
    startDate: Date;
    endDate: Date;
}

export interface UpdateRentalBookingInput {
    status?: OrderStatus;
    cancellationReason?: string;
}

export interface SearchRentalSpaceInput {
    location?: string;
    minSize?: number;
    maxSize?: number;
    minPrice?: number;
    maxPrice?: number;
    availability?: boolean;
    page?: number;
    limit?: number;
}

// ============ RESPONSE TYPES ============
export interface RentalSpaceResponse {
    id: number;
    vendorId: number;
    location: string;
    size: number;
    price: number;
    availability: boolean;
    vendor: {
        id: number;
        farmName: string;
        user: {
            name: string;
            email: string;
            phoneNumber?: string;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface RentalBookingResponse {
    id: number;
    spaceId: number;
    userId: number;
    startDate: Date;
    endDate: Date;
    status: OrderStatus;
    orderDate: Date;
    space: {
        location: string;
        size: number;
        price: number;
        vendor: {
            farmName: string;
            user: {
                name: string;
                email: string;
                phoneNumber?: string;
            };
        };
    };
}

export interface PaginatedRentalSpacesResponse {
    spaces: RentalSpaceResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}