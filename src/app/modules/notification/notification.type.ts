// modules/notification/notification.type.ts

export interface GetNotificationsQuery {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: string;
}

export interface MarkAsReadInput {
    notificationIds: number[];
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
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
}