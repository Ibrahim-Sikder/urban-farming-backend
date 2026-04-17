import { PaginationParams } from '../../shared/types/common.types';

export interface GetNotificationsQuery extends PaginationParams {
    isRead?: boolean;
    type?: string;
}

export interface MarkAsReadInput {
    notificationIds: number[];
}

export interface MarkAllAsReadInput {
    type?: string;
}

export interface NotificationResponse {
    id: number;
    userId: number;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    metadata?: any;
    createdAt: Date;
}

export interface PaginatedNotificationsResponse {
    notifications: NotificationResponse[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
    unreadCount: number;
}

export interface UnreadCountResponse {
    unreadCount: number;
}

export interface BulkOperationResponse {
    message: string;
    count: number;
}

export interface MessageResponse {
    message: string;
}

// Re-export common types
export { PaginatedResponse } from '../../shared/types/common.types';