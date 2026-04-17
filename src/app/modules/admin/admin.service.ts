import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import { PrismaQueryBuilder } from '../../shared/utils/prisma-query-builder';
import { CertificationStatus, UserStatus } from '@prisma/client';
import {
    DashboardFilters,
    DashboardStatsResponse,
    UserQueryParams,
    VendorQueryParams,
    CertificationQueryParams,
    OrderQueryParams,
    VendorListResponse,
    CertificationListResponse,
    PaginatedResponse
} from './admin.type';
import { PaginationParams } from '@/app/shared/types/common.types';

export class AdminService {

    // ============ DASHBOARD STATISTICS WITH CACHE ============
    static async getDashboardStats(filters?: DashboardFilters): Promise<DashboardStatsResponse> {
        const cacheKey = `admin:dashboard:${JSON.stringify(filters)}`;

        // Try cache
        const cached = await RedisCacheService.getFast<DashboardStatsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const startTime = Date.now();

        const dateFilter = filters?.startDate || filters?.endDate
            ? Prisma.sql`AND "createdAt" >= ${filters?.startDate || new Date(0)} AND "createdAt" <= ${filters?.endDate || new Date()}`
            : Prisma.empty;

        // Get all stats in parallel with optimized queries
        const [
            totalUsers,
            totalVendors,
            totalCustomers,
            totalOrders,
            pendingVendors,
            pendingCertifications,
            totalRentalSpaces,
            totalRevenueResult,
            recentOrders,
            recentUsers
        ] = await Promise.all([
            prisma.$queryRaw<{ count: number }[]>`
                SELECT COUNT(*) as count FROM "User" WHERE "deletedAt" IS NULL
            `,
            prisma.$queryRaw<{ count: number }[]>`
                SELECT COUNT(*) as count FROM "VendorProfile"
            `,
            prisma.$queryRaw<{ count: number }[]>`
                SELECT COUNT(*) as count FROM "User" WHERE role = 'CUSTOMER' AND "deletedAt" IS NULL
            `,
            prisma.$queryRaw<{ count: number }[]>`
                SELECT COUNT(*) as count FROM "Order"
            `,
            prisma.$queryRaw<{ count: number }[]>`
                SELECT COUNT(*) as count FROM "VendorProfile" WHERE "certificationStatus" = 'PENDING'
            `,
            prisma.$queryRaw<{ count: number }[]>`
                SELECT COUNT(*) as count FROM "SustainabilityCert" WHERE "verificationStatus" = 'PENDING'
            `,
            prisma.$queryRaw<{ count: number }[]>`
                SELECT COUNT(*) as count FROM "RentalSpace"
            `,
            prisma.$queryRaw<{ total: number }[]>`
                SELECT COALESCE(SUM("totalPrice"), 0) as total FROM "Order" WHERE status = 'COMPLETED'
            `,
            prisma.$queryRaw<any[]>`
                SELECT 
                    o.id,
                    o."totalPrice",
                    o.status,
                    o."orderDate",
                    u.name as user_name,
                    u.email as user_email
                FROM "Order" o
                LEFT JOIN "User" u ON o."userId" = u.id
                ORDER BY o."orderDate" DESC
                LIMIT 10
            `,
            prisma.$queryRaw<any[]>`
                SELECT 
                    id,
                    name,
                    email,
                    role,
                    "createdAt"
                FROM "User"
                WHERE "deletedAt" IS NULL
                ORDER BY "createdAt" DESC
                LIMIT 10
            `
        ]);

        const totalRevenue = Number(totalRevenueResult[0]?.total) || 0;

        const response: DashboardStatsResponse = {
            totalUsers: Number(totalUsers[0]?.count) || 0,
            totalVendors: Number(totalVendors[0]?.count) || 0,
            totalCustomers: Number(totalCustomers[0]?.count) || 0,
            totalOrders: Number(totalOrders[0]?.count) || 0,
            totalRevenue,
            pendingVendors: Number(pendingVendors[0]?.count) || 0,
            pendingCertifications: Number(pendingCertifications[0]?.count) || 0,
            pendingRentalSpaces: 0,
            recentOrders: recentOrders.map((order: any) => ({
                id: order.id,
                totalPrice: Number(order.totalPrice),
                status: order.status,
                orderDate: order.orderDate,
                user: {
                    name: order.user_name,
                    email: order.user_email
                }
            })),
            recentUsers: recentUsers.map((user: any) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }))
        };

        const queryTime = Date.now() - startTime;
        console.log(`📊 Dashboard stats query took: ${queryTime}ms`);

        // Cache for 5 minutes
        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }

    // ============ USER MANAGEMENT WITH QUERY BUILDER ============
    static async getAllUsers(queryParams: UserQueryParams = {}): Promise<PaginatedResponse<any>> {
        const cacheKey = `admin:users:${JSON.stringify(queryParams)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<any>>(cacheKey);
        if (cached) {
            return cached;
        }

        // Build query using query builder
        const queryBuilder = new PrismaQueryBuilder('User', queryParams as any);

        // Set searchable fields
        queryBuilder.setSearchFields(['name', 'email']);

        // Add filters
        if (queryParams.role) {
            const roleCondition = Prisma.sql`role = ${queryParams.role}`;
            queryBuilder.addCustomCondition(roleCondition);
        }
        if (queryParams.status) {
            const statusCondition = Prisma.sql`status = ${queryParams.status}`;
            queryBuilder.addCustomCondition(statusCondition);
        }

        // Add deleted filter
        const notDeletedCondition = Prisma.sql`"deletedAt" IS NULL`;
        queryBuilder.addCustomCondition(notDeletedCondition);

        // Custom query with vendor profile info
        const customQuery = Prisma.sql`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.status,
                u."phoneNumber",
                u."createdAt",
                vp.id as vendor_id,
                vp."farmName",
                vp."certificationStatus"
            FROM "User" u
            LEFT JOIN "VendorProfile" vp ON u.id = vp."userId"
        `;

        const result = await queryBuilder.execute<any>(customQuery);

        // Transform data
        const transformedUsers = result.data.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            vendorProfile: user.vendor_id ? {
                farmName: user.farmName,
                certificationStatus: user.certificationStatus
            } : null
        }));

        const response: PaginatedResponse<any> = {
            data: transformedUsers,
            meta: result.meta
        };

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    static async updateUserStatus(userId: number, status: UserStatus): Promise<any> {
        const user = await prisma.$queryRaw<any[]>`
            UPDATE "User"
            SET status = ${status}, "updatedAt" = NOW()
            WHERE id = ${userId}
            RETURNING id, name, email, status
        `;

        // Create notification
        await prisma.$executeRaw`
            INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
            VALUES (${userId}, 'Account Status Updated', ${`Your account has been ${status.toLowerCase()}`}, 'SYSTEM', false, NOW(), NOW())
        `;

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern('admin:users:*'),
            RedisCacheService.delPattern('admin:dashboard:*'),
            RedisCacheService.del(`user:${userId}`)
        ]);

        return user[0];
    }

    static async deleteUser(userId: number): Promise<{ message: string }> {
        await prisma.$executeRaw`
            UPDATE "User"
            SET "deletedAt" = NOW(), status = 'INACTIVE', "updatedAt" = NOW()
            WHERE id = ${userId}
        `;

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern('admin:users:*'),
            RedisCacheService.delPattern('admin:dashboard:*'),
            RedisCacheService.del(`user:${userId}`)
        ]);

        return { message: 'User deleted successfully' };
    }

    // ============ VENDOR MANAGEMENT WITH QUERY BUILDER ============
    static async getAllVendors(queryParams: VendorQueryParams = {}): Promise<PaginatedResponse<VendorListResponse>> {
        const cacheKey = `admin:vendors:${JSON.stringify(queryParams)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<VendorListResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        // Build query using query builder
        const queryBuilder = new PrismaQueryBuilder('VendorProfile', queryParams as any);

        // Set searchable fields
        queryBuilder.setSearchFields(['farmName', 'farmLocation']);

        // Add certification filter
        if (queryParams.certificationStatus) {
            const certCondition = Prisma.sql`"certificationStatus" = ${queryParams.certificationStatus}`;
            queryBuilder.addCustomCondition(certCondition);
        }

        // Custom query with stats
        const customQuery = Prisma.sql`
            SELECT 
                vp.id,
                vp."farmName",
                vp."farmLocation",
                vp."certificationStatus",
                vp."createdAt",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u."phoneNumber" as user_phone,
                (SELECT COUNT(*) FROM "Produce" WHERE "vendorId" = vp.id) as total_products,
                (SELECT COUNT(*) FROM "Order" WHERE "vendorId" = vp.id) as total_orders,
                (SELECT COALESCE(SUM("totalPrice"), 0) FROM "Order" WHERE "vendorId" = vp.id AND status = 'COMPLETED') as total_revenue
            FROM "VendorProfile" vp
            LEFT JOIN "User" u ON vp."userId" = u.id
        `;

        const result = await queryBuilder.execute<any>(customQuery);

        // Transform data
        const transformedVendors: VendorListResponse[] = result.data.map((vendor: any) => ({
            id: vendor.id,
            farmName: vendor.farmName,
            farmLocation: vendor.farmLocation,
            certificationStatus: vendor.certificationStatus,
            user: {
                name: vendor.user_name,
                email: vendor.user_email,
                phoneNumber: vendor.user_phone || undefined,
            },
            totalProducts: Number(vendor.total_products) || 0,
            totalOrders: Number(vendor.total_orders) || 0,
            totalRevenue: Number(vendor.total_revenue) || 0,
            createdAt: vendor.createdAt,
        }));

        const response: PaginatedResponse<VendorListResponse> = {
            data: transformedVendors,
            meta: result.meta
        };

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    static async verifyVendor(vendorId: number, status: CertificationStatus, rejectionReason?: string): Promise<any> {
        const vendor = await prisma.$queryRaw<any[]>`
            UPDATE "VendorProfile"
            SET "certificationStatus" = ${status}, "updatedAt" = NOW()
            WHERE id = ${vendorId}
            RETURNING id, "userId", "certificationStatus"
        `;

        const vendorData = vendor[0];

        // Create notification
        const title = status === 'APPROVED' ? 'Vendor Approved' : 'Vendor Rejected';
        const message = status === 'APPROVED'
            ? 'Your vendor account has been approved!'
            : `Your vendor account was rejected. Reason: ${rejectionReason || 'No reason provided'}`;

        await prisma.$executeRaw`
            INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
            VALUES (${vendorData.userId}, ${title}, ${message}, 'SYSTEM', false, NOW(), NOW())
        `;

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern('admin:vendors:*'),
            RedisCacheService.delPattern('admin:dashboard:*'),
            RedisCacheService.del(`vendor:profile:${vendorData.userId}`)
        ]);

        return vendorData;
    }

    // ============ CERTIFICATION MANAGEMENT WITH QUERY BUILDER ============
    static async getAllCertifications(queryParams: CertificationQueryParams = {}): Promise<PaginatedResponse<CertificationListResponse>> {
        const cacheKey = `admin:certifications:${JSON.stringify(queryParams)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<CertificationListResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        // Build query using query builder
        const queryBuilder = new PrismaQueryBuilder('SustainabilityCert', queryParams as any);

        // Add verification filter
        if (queryParams.verificationStatus) {
            const statusCondition = Prisma.sql`"verificationStatus" = ${queryParams.verificationStatus}`;
            queryBuilder.addCustomCondition(statusCondition);
        }

        if (queryParams.vendorId) {
            const vendorCondition = Prisma.sql`"vendorId" = ${queryParams.vendorId}`;
            queryBuilder.addCustomCondition(vendorCondition);
        }

        // Custom query with vendor info
        const customQuery = Prisma.sql`
            SELECT 
                sc.id,
                sc."certifyingAgency",
                sc."certificationDate",
                sc."expiryDate",
                sc."verificationStatus",
                sc."createdAt",
                vp.id as vendor_id,
                vp."farmName",
                u.name as user_name,
                u.email as user_email
            FROM "SustainabilityCert" sc
            LEFT JOIN "VendorProfile" vp ON sc."vendorId" = vp.id
            LEFT JOIN "User" u ON vp."userId" = u.id
        `;

        const result = await queryBuilder.execute<any>(customQuery);

        // Transform data
        const transformedCerts: CertificationListResponse[] = result.data.map((cert: any) => ({
            id: cert.id,
            certifyingAgency: cert.certifyingAgency,
            certificationDate: cert.certificationDate,
            expiryDate: cert.expiryDate,
            verificationStatus: cert.verificationStatus,
            vendor: {
                farmName: cert.farmName,
                user: {
                    name: cert.user_name,
                    email: cert.user_email,
                },
            },
            createdAt: cert.createdAt,
        }));

        const response: PaginatedResponse<CertificationListResponse> = {
            data: transformedCerts,
            meta: result.meta
        };

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    static async verifyCertification(certId: number, status: CertificationStatus, verificationNotes?: string): Promise<any> {
        const cert = await prisma.$queryRaw<any[]>`
            UPDATE "SustainabilityCert"
            SET "verificationStatus" = ${status}, "verifiedAt" = NOW(), "updatedAt" = NOW()
            WHERE id = ${certId}
            RETURNING id, "vendorId", "verificationStatus"
        `;

        const certData = cert[0];

        // Update vendor certification status
        if (status === 'APPROVED') {
            await prisma.$executeRaw`
                UPDATE "VendorProfile"
                SET "certificationStatus" = 'APPROVED', "updatedAt" = NOW()
                WHERE id = ${certData.vendorId}
            `;
        } else if (status === 'REJECTED') {
            await prisma.$executeRaw`
                UPDATE "VendorProfile"
                SET "certificationStatus" = 'REJECTED', "updatedAt" = NOW()
                WHERE id = ${certData.vendorId}
            `;
        }

        // Get vendor user ID for notification
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT "userId" FROM "VendorProfile" WHERE id = ${certData.vendorId} LIMIT 1
        `;

        const title = status === 'APPROVED' ? 'Certification Approved' : 'Certification Rejected';
        const message = `Your sustainability certification has been ${status.toLowerCase()}`;

        await prisma.$executeRaw`
            INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
            VALUES (${vendor[0].userId}, ${title}, ${message}, 'CERTIFICATION', false, NOW(), NOW())
        `;

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern('admin:certifications:*'),
            RedisCacheService.delPattern('admin:vendors:*'),
            RedisCacheService.delPattern('admin:dashboard:*')
        ]);

        return certData;
    }

    // ============ RENTAL SPACE MANAGEMENT WITH QUERY BUILDER ============
    static async getAllRentalSpaces(queryParams: PaginationParams = {}): Promise<PaginatedResponse<any>> {
        const cacheKey = `admin:rental-spaces:${JSON.stringify(queryParams)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<any>>(cacheKey);
        if (cached) {
            return cached;
        }

        // Build query using query builder
        const queryBuilder = new PrismaQueryBuilder('RentalSpace', queryParams as any);

        // Custom query with vendor and booking info
        const customQuery = Prisma.sql`
            SELECT 
                rs.id,
                rs."vendorId",
                rs.location,
                rs.size,
                rs.price,
                rs.availability,
                rs."createdAt",
                rs."updatedAt",
                vp."farmName",
                u.name as user_name,
                u.email as user_email,
                (SELECT COUNT(*) FROM "RentalBooking" WHERE "spaceId" = rs.id) as bookings_count
            FROM "RentalSpace" rs
            LEFT JOIN "VendorProfile" vp ON rs."vendorId" = vp.id
            LEFT JOIN "User" u ON vp."userId" = u.id
        `;

        const result = await queryBuilder.execute<any>(customQuery);

        // Transform data
        const transformedSpaces = result.data.map((space: any) => ({
            id: space.id,
            vendorId: space.vendorId,
            location: space.location,
            size: Number(space.size),
            price: Number(space.price),
            availability: space.availability,
            createdAt: space.createdAt,
            updatedAt: space.updatedAt,
            vendor: {
                farmName: space.farmName,
                user: {
                    name: space.user_name,
                    email: space.user_email,
                },
            },
            bookingsCount: Number(space.bookings_count) || 0,
        }));

        const response: PaginatedResponse<any> = {
            data: transformedSpaces,
            meta: result.meta
        };

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    // ============ ORDER MANAGEMENT WITH QUERY BUILDER ============
    static async getAllOrders(queryParams: OrderQueryParams = {}): Promise<PaginatedResponse<any>> {
        const cacheKey = `admin:orders:${JSON.stringify(queryParams)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<any>>(cacheKey);
        if (cached) {
            return cached;
        }

        // Build query using query builder
        const queryBuilder = new PrismaQueryBuilder('Order', queryParams as any);

        // Add status filter
        if (queryParams.status) {
            const statusCondition = Prisma.sql`status = ${queryParams.status}`;
            queryBuilder.addCustomCondition(statusCondition);
        }

        // Add amount range filters
        if (queryParams.minAmount !== undefined) {
            const minCondition = Prisma.sql`"totalPrice" >= ${queryParams.minAmount}`;
            queryBuilder.addCustomCondition(minCondition);
        }
        if (queryParams.maxAmount !== undefined) {
            const maxCondition = Prisma.sql`"totalPrice" <= ${queryParams.maxAmount}`;
            queryBuilder.addCustomCondition(maxCondition);
        }

        // Custom query with user, produce, and vendor info
        const customQuery = Prisma.sql`
            SELECT 
                o.id,
                o.quantity,
                o."totalPrice",
                o.status,
                o."orderDate",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                p.id as produce_id,
                p.name as produce_name,
                vp."farmName" as vendor_farmName
            FROM "Order" o
            LEFT JOIN "User" u ON o."userId" = u.id
            LEFT JOIN "Produce" p ON o."produceId" = p.id
            LEFT JOIN "VendorProfile" vp ON o."vendorId" = vp.id
        `;

        const result = await queryBuilder.execute<any>(customQuery);

        // Transform data
        const transformedOrders = result.data.map((order: any) => ({
            id: order.id,
            quantity: order.quantity,
            totalPrice: Number(order.totalPrice),
            status: order.status,
            orderDate: order.orderDate,
            user: {
                name: order.user_name,
                email: order.user_email,
            },
            produce: {
                name: order.produce_name,
            },
            vendor: {
                farmName: order.vendor_farmName,
            },
        }));

        const response: PaginatedResponse<any> = {
            data: transformedOrders,
            meta: result.meta
        };

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }
}