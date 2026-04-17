"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const prisma_query_builder_1 = require("../../shared/utils/prisma-query-builder");
class AdminService {
    static async getDashboardStats(filters) {
        const cacheKey = `admin:dashboard:${JSON.stringify(filters)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const startTime = Date.now();
        const dateFilter = filters?.startDate || filters?.endDate
            ? client_1.Prisma.sql `AND "createdAt" >= ${filters?.startDate || new Date(0)} AND "createdAt" <= ${filters?.endDate || new Date()}`
            : client_1.Prisma.empty;
        const [totalUsers, totalVendors, totalCustomers, totalOrders, pendingVendors, pendingCertifications, totalRentalSpaces, totalRevenueResult, recentOrders, recentUsers] = await Promise.all([
            prisma_1.default.$queryRaw `
                SELECT COUNT(*) as count FROM "User" WHERE "deletedAt" IS NULL
            `,
            prisma_1.default.$queryRaw `
                SELECT COUNT(*) as count FROM "VendorProfile"
            `,
            prisma_1.default.$queryRaw `
                SELECT COUNT(*) as count FROM "User" WHERE role = 'CUSTOMER' AND "deletedAt" IS NULL
            `,
            prisma_1.default.$queryRaw `
                SELECT COUNT(*) as count FROM "Order"
            `,
            prisma_1.default.$queryRaw `
                SELECT COUNT(*) as count FROM "VendorProfile" WHERE "certificationStatus" = 'PENDING'
            `,
            prisma_1.default.$queryRaw `
                SELECT COUNT(*) as count FROM "SustainabilityCert" WHERE "verificationStatus" = 'PENDING'
            `,
            prisma_1.default.$queryRaw `
                SELECT COUNT(*) as count FROM "RentalSpace"
            `,
            prisma_1.default.$queryRaw `
                SELECT COALESCE(SUM("totalPrice"), 0) as total FROM "Order" WHERE status = 'COMPLETED'
            `,
            prisma_1.default.$queryRaw `
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
            prisma_1.default.$queryRaw `
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
        const response = {
            totalUsers: Number(totalUsers[0]?.count) || 0,
            totalVendors: Number(totalVendors[0]?.count) || 0,
            totalCustomers: Number(totalCustomers[0]?.count) || 0,
            totalOrders: Number(totalOrders[0]?.count) || 0,
            totalRevenue,
            pendingVendors: Number(pendingVendors[0]?.count) || 0,
            pendingCertifications: Number(pendingCertifications[0]?.count) || 0,
            pendingRentalSpaces: 0,
            recentOrders: recentOrders.map((order) => ({
                id: order.id,
                totalPrice: Number(order.totalPrice),
                status: order.status,
                orderDate: order.orderDate,
                user: {
                    name: order.user_name,
                    email: order.user_email
                }
            })),
            recentUsers: recentUsers.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }))
        };
        const queryTime = Date.now() - startTime;
        console.log(`📊 Dashboard stats query took: ${queryTime}ms`);
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async getAllUsers(queryParams = {}) {
        const cacheKey = `admin:users:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('User', queryParams);
        queryBuilder.setSearchFields(['name', 'email']);
        if (queryParams.role) {
            const roleCondition = client_1.Prisma.sql `role = ${queryParams.role}`;
            queryBuilder.addCustomCondition(roleCondition);
        }
        if (queryParams.status) {
            const statusCondition = client_1.Prisma.sql `status = ${queryParams.status}`;
            queryBuilder.addCustomCondition(statusCondition);
        }
        const notDeletedCondition = client_1.Prisma.sql `"deletedAt" IS NULL`;
        queryBuilder.addCustomCondition(notDeletedCondition);
        const customQuery = client_1.Prisma.sql `
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
        const result = await queryBuilder.execute(customQuery);
        const transformedUsers = result.data.map((user) => ({
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
        const response = {
            data: transformedUsers,
            meta: result.meta
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async updateUserStatus(userId, status) {
        const user = await prisma_1.default.$queryRaw `
            UPDATE "User"
            SET status = ${status}, "updatedAt" = NOW()
            WHERE id = ${userId}
            RETURNING id, name, email, status
        `;
        await prisma_1.default.$executeRaw `
            INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
            VALUES (${userId}, 'Account Status Updated', ${`Your account has been ${status.toLowerCase()}`}, 'SYSTEM', false, NOW(), NOW())
        `;
        await Promise.all([
            redis_cache_service_1.default.delPattern('admin:users:*'),
            redis_cache_service_1.default.delPattern('admin:dashboard:*'),
            redis_cache_service_1.default.del(`user:${userId}`)
        ]);
        return user[0];
    }
    static async deleteUser(userId) {
        await prisma_1.default.$executeRaw `
            UPDATE "User"
            SET "deletedAt" = NOW(), status = 'INACTIVE', "updatedAt" = NOW()
            WHERE id = ${userId}
        `;
        await Promise.all([
            redis_cache_service_1.default.delPattern('admin:users:*'),
            redis_cache_service_1.default.delPattern('admin:dashboard:*'),
            redis_cache_service_1.default.del(`user:${userId}`)
        ]);
        return { message: 'User deleted successfully' };
    }
    static async getAllVendors(queryParams = {}) {
        const cacheKey = `admin:vendors:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('VendorProfile', queryParams);
        queryBuilder.setSearchFields(['farmName', 'farmLocation']);
        if (queryParams.certificationStatus) {
            const certCondition = client_1.Prisma.sql `"certificationStatus" = ${queryParams.certificationStatus}`;
            queryBuilder.addCustomCondition(certCondition);
        }
        const customQuery = client_1.Prisma.sql `
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
        const result = await queryBuilder.execute(customQuery);
        const transformedVendors = result.data.map((vendor) => ({
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
        const response = {
            data: transformedVendors,
            meta: result.meta
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async verifyVendor(vendorId, status, rejectionReason) {
        const vendor = await prisma_1.default.$queryRaw `
            UPDATE "VendorProfile"
            SET "certificationStatus" = ${status}, "updatedAt" = NOW()
            WHERE id = ${vendorId}
            RETURNING id, "userId", "certificationStatus"
        `;
        const vendorData = vendor[0];
        const title = status === 'APPROVED' ? 'Vendor Approved' : 'Vendor Rejected';
        const message = status === 'APPROVED'
            ? 'Your vendor account has been approved!'
            : `Your vendor account was rejected. Reason: ${rejectionReason || 'No reason provided'}`;
        await prisma_1.default.$executeRaw `
            INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
            VALUES (${vendorData.userId}, ${title}, ${message}, 'SYSTEM', false, NOW(), NOW())
        `;
        await Promise.all([
            redis_cache_service_1.default.delPattern('admin:vendors:*'),
            redis_cache_service_1.default.delPattern('admin:dashboard:*'),
            redis_cache_service_1.default.del(`vendor:profile:${vendorData.userId}`)
        ]);
        return vendorData;
    }
    static async getAllCertifications(queryParams = {}) {
        const cacheKey = `admin:certifications:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('SustainabilityCert', queryParams);
        if (queryParams.verificationStatus) {
            const statusCondition = client_1.Prisma.sql `"verificationStatus" = ${queryParams.verificationStatus}`;
            queryBuilder.addCustomCondition(statusCondition);
        }
        if (queryParams.vendorId) {
            const vendorCondition = client_1.Prisma.sql `"vendorId" = ${queryParams.vendorId}`;
            queryBuilder.addCustomCondition(vendorCondition);
        }
        const customQuery = client_1.Prisma.sql `
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
        const result = await queryBuilder.execute(customQuery);
        const transformedCerts = result.data.map((cert) => ({
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
        const response = {
            data: transformedCerts,
            meta: result.meta
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async verifyCertification(certId, status, verificationNotes) {
        const cert = await prisma_1.default.$queryRaw `
            UPDATE "SustainabilityCert"
            SET "verificationStatus" = ${status}, "verifiedAt" = NOW(), "updatedAt" = NOW()
            WHERE id = ${certId}
            RETURNING id, "vendorId", "verificationStatus"
        `;
        const certData = cert[0];
        if (status === 'APPROVED') {
            await prisma_1.default.$executeRaw `
                UPDATE "VendorProfile"
                SET "certificationStatus" = 'APPROVED', "updatedAt" = NOW()
                WHERE id = ${certData.vendorId}
            `;
        }
        else if (status === 'REJECTED') {
            await prisma_1.default.$executeRaw `
                UPDATE "VendorProfile"
                SET "certificationStatus" = 'REJECTED', "updatedAt" = NOW()
                WHERE id = ${certData.vendorId}
            `;
        }
        const vendor = await prisma_1.default.$queryRaw `
            SELECT "userId" FROM "VendorProfile" WHERE id = ${certData.vendorId} LIMIT 1
        `;
        const title = status === 'APPROVED' ? 'Certification Approved' : 'Certification Rejected';
        const message = `Your sustainability certification has been ${status.toLowerCase()}`;
        await prisma_1.default.$executeRaw `
            INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
            VALUES (${vendor[0].userId}, ${title}, ${message}, 'CERTIFICATION', false, NOW(), NOW())
        `;
        await Promise.all([
            redis_cache_service_1.default.delPattern('admin:certifications:*'),
            redis_cache_service_1.default.delPattern('admin:vendors:*'),
            redis_cache_service_1.default.delPattern('admin:dashboard:*')
        ]);
        return certData;
    }
    static async getAllRentalSpaces(queryParams = {}) {
        const cacheKey = `admin:rental-spaces:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('RentalSpace', queryParams);
        const customQuery = client_1.Prisma.sql `
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
        const result = await queryBuilder.execute(customQuery);
        const transformedSpaces = result.data.map((space) => ({
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
        const response = {
            data: transformedSpaces,
            meta: result.meta
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async getAllOrders(queryParams = {}) {
        const cacheKey = `admin:orders:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('Order', queryParams);
        if (queryParams.status) {
            const statusCondition = client_1.Prisma.sql `status = ${queryParams.status}`;
            queryBuilder.addCustomCondition(statusCondition);
        }
        if (queryParams.minAmount !== undefined) {
            const minCondition = client_1.Prisma.sql `"totalPrice" >= ${queryParams.minAmount}`;
            queryBuilder.addCustomCondition(minCondition);
        }
        if (queryParams.maxAmount !== undefined) {
            const maxCondition = client_1.Prisma.sql `"totalPrice" <= ${queryParams.maxAmount}`;
            queryBuilder.addCustomCondition(maxCondition);
        }
        const customQuery = client_1.Prisma.sql `
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
        const result = await queryBuilder.execute(customQuery);
        const transformedOrders = result.data.map((order) => ({
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
        const response = {
            data: transformedOrders,
            meta: result.meta
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map