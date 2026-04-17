// ============ PAGINATION TYPES ============

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    searchTerm?: string;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

// ============ COMMON FILTER TYPES ============

export interface DateRangeFilter {
    startDate?: Date;
    endDate?: Date;
}

export interface PriceRangeFilter {
    minPrice?: number;
    maxPrice?: number;
}

export interface SizeRangeFilter {
    minSize?: number;
    maxSize?: number;
}

export interface LocationFilter {
    location?: string;
    city?: string;
    area?: string;
    zipCode?: string;
}

// ============ API RESPONSE TYPES ============

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message: string;
    timestamp: string;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    errors?: any;
    timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============ COMMON ENTITY TYPES ============

export interface TimestampFields {
    createdAt: Date;
    updatedAt: Date;
}

export interface SoftDeleteFields {
    deletedAt?: Date | null;
}

export interface UserInfo {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
    profileImage?: string;
}

// ============ QUERY BUILDER TYPES ============

export interface QueryBuilderConfig {
    searchableFields?: string[];
    sortableFields?: string[];
    filterableFields?: string[];
    defaultSortBy?: string;
    defaultSortOrder?: 'asc' | 'desc';
    defaultLimit?: number;
    maxLimit?: number;
}

// ============ CACHE TYPES ============

export interface CacheOptions {
    ttl?: number;
    key?: string;
    compress?: boolean;
}

// ============ BULK OPERATION TYPES ============

export interface BulkOperationResult {
    success: number;
    failed: number;
    errors?: Array<{
        id?: number;
        error: string;
    }>;
}

export interface IdResponse {
    id: number;
}

export interface MessageResponse {
    message: string;
}

// ============ ENUM HELPERS ============

export type SortOrder = 'asc' | 'desc';
export type Status = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'COMPLETED' | 'CANCELLED';