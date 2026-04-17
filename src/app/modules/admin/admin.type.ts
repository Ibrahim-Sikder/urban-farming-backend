// modules/admin/admin.type.ts
import { UserStatus, Role, CertificationStatus, OrderStatus } from '@prisma/client';

// ============ INPUT TYPES ============
export interface UpdateUserStatusInput {
    userId: number;
    status: UserStatus;
}

export interface VerifyVendorInput {
    vendorId: number;
    status: CertificationStatus;
    rejectionReason?: string;
}

export interface VerifyCertificationInput {
    certId: number;
    status: CertificationStatus;
    verificationNotes?: string;
}

// Remove ApproveRentalSpaceInput since no isApproved field
// export interface ApproveRentalSpaceInput {
//     spaceId: number;
//     isApproved: boolean;
//     rejectionReason?: string;
// }

export interface ModeratePostInput {
    postId: number;
    isApproved: boolean;
    rejectionReason?: string;
}

export interface DashboardFilters {
    startDate?: Date;
    endDate?: Date;
}

// ============ RESPONSE TYPES ============
export interface DashboardStatsResponse {
    totalUsers: number;
    totalVendors: number;
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    pendingVendors: number;
    pendingCertifications: number;
    pendingRentalSpaces: number;
    recentOrders: Array<{
        id: number;
        totalPrice: number;
        status: OrderStatus;
        orderDate: Date;
        user: { name: string; email: string };
    }>;
    recentUsers: Array<{
        id: number;
        name: string;
        email: string;
        role: Role;
        createdAt: Date;
    }>;
}

export interface VendorListResponse {
    id: number;
    farmName: string;
    farmLocation: string;
    certificationStatus: CertificationStatus;
    user: {
        name: string;
        email: string;
        phoneNumber?: string;
    };
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    createdAt: Date;
}

export interface CertificationListResponse {
    id: number;
    certifyingAgency: string;
    certificationDate: Date;
    expiryDate?: Date;
    verificationStatus: CertificationStatus;
    vendor: {
        farmName: string;
        user: {
            name: string;
            email: string;
        };
    };
    createdAt: Date;
}