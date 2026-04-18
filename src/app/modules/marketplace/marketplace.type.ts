import { OrderStatus, CertificationStatus } from '@prisma/client';
import { PaginationParams, PriceRangeFilter } from '../../shared/types/common.types';

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

export interface ProduceFilters extends PaginationParams, PriceRangeFilter {
    category?: string;
    certificationStatus?: CertificationStatus;
    search?: string;
    vendorId?: number;
    inStock?: boolean;
    status?: string;
}

export interface CartItemInput {
    produceId: number;
    quantity: number;
}

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
            email?: string;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface CartItemResponse {
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
}

export interface CartResponse {
    items: CartItemResponse[];
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
export { PaginatedResponse } from '../../shared/types/common.types';