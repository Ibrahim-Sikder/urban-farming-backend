import { CertificationStatus, OrderStatus } from '@prisma/client';
import { PaginationParams, DateRangeFilter } from '../../shared/types/common.types';
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

export interface VendorProduceQueryParams extends PaginationParams {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    certificationStatus?: CertificationStatus;
}

export interface VendorOrderQueryParams extends PaginationParams {
    status?: OrderStatus;
    dateRange?: DateRangeFilter;
}

export interface MessageResponse {
    message: string;
}

export interface VendorProfileResponse {
    id: number;
    farmName: string;
    farmLocation: string;
    certificationStatus: CertificationStatus;
    user: {
        id: number;
        name: string;
        email: string;
        phoneNumber?: string;
        address?: string;
    };
    stats: {
        totalProducts: number;
        totalRentalSpaces: number;
        availableSpaces: number;
        totalOrders: number;
        pendingOrders: number;
        completedOrders: number;
        totalRevenue: number;
    };
    produce: any[];
    rentalSpaces: any[];
    sustainabilityCert?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface VendorProduceResponse {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    certificationStatus: CertificationStatus;
    availableQuantity: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface VendorOrderResponse {
    id: number;
    quantity: number;
    totalPrice: number;
    status: OrderStatus;
    orderDate: Date;
    user: {
        id: number;
        name: string;
        email: string;
    };
    produce: {
        id: number;
        name: string;
    };
}

export interface VendorBookingResponse {
    id: number;
    spaceId: number;
    startDate: Date;
    endDate: Date;
    status: OrderStatus;
    orderDate: Date;
    user: {
        id: number;
        name: string;
        email: string;
    };
    space: {
        location: string;
        size: number;
        price: number;
    };
}

export interface RevenueReportResponse {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: Array<{
        productId: number;
        productName: string;
        quantitySold: number;
        revenue: number;
    }>;
}

export { PaginatedResponse } from '../../shared/types/common.types';