// modules/marketplace/marketplace.type.ts
import { OrderStatus, CertificationStatus } from '@prisma/client';

// ============ INPUT TYPES ============
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

export interface AddToCartInput {
    produceId: number;
    quantity: number;
}

export interface UpdateCartItemInput {
    quantity: number;
}

export interface CreateOrderInput {
    produceId: number;
    quantity: number;
    vendorId: number;
}

export interface UpdateOrderStatusInput {
    status: OrderStatus;
}

export interface ProduceFilters {
    category?: string;
    certificationStatus?: CertificationStatus;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    vendorId?: number;
    page?: number;
    limit?: number;
}

// ============ RESPONSE TYPES ============
export interface ProduceResponse {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    certificationStatus: CertificationStatus;
    availableQuantity: number;
    vendor: {
        id: number;
        farmName: string;
        user: {
            name: string;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface CartResponse {
    items: Array<{
        id: number;
        quantity: number;
        produce: {
            id: number;
            name: string;
            price: number;
            availableQuantity: number;
            vendor: {
                farmName: string;
            };
        };
        subtotal: number;
    }>;
    totalItems: number;
    totalPrice: number;
}

export interface OrderResponse {
    id: number;
    quantity: number;
    totalPrice: number;
    status: OrderStatus;
    orderDate: Date;
    produce: {
        id: number;
        name: string;
        vendor: {
            farmName: string;
        };
    };
}

export interface PaginatedProduceResponse {
    produces: ProduceResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}