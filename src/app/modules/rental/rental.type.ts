import { OrderStatus } from '@prisma/client';
import {
    PaginationParams,
    PriceRangeFilter,
    SizeRangeFilter,
    LocationFilter,
    DateRangeFilter,
    PaginatedResponse
} from '../../shared/types/common.types';

export interface SearchRentalSpaceInput extends PaginationParams, PriceRangeFilter, SizeRangeFilter, LocationFilter {
    availability?: boolean;
}

export interface GetUserBookingsInput extends PaginationParams {
    status?: OrderStatus;
    dateRange?: DateRangeFilter;
}

export interface CreateRentalBookingInput {
    spaceId: number;
    startDate: Date;
    endDate: Date;
}

export interface UpdateRentalBookingInput {
    status?: OrderStatus;
    cancellationReason?: string;
}
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
    meta: PaginatedResponse<any>['meta'];
}

export interface PaginatedBookingsResponse {
    bookings: RentalBookingResponse[];
    meta: PaginatedResponse<any>['meta'];
}