"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const socket_service_1 = __importDefault(require("../../services/socket.service"));
const prisma_query_builder_1 = require("../../shared/utils/prisma-query-builder");
class AdminService {
    static async getDashboardStats(filters) {
        try {
            const cacheKey = `admin:dashboard:${JSON.stringify(filters)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached)
                return cached;
            const dateFilter = {};
            if (filters?.startDate || filters?.endDate) {
                dateFilter.createdAt = {};
                if (filters?.startDate)
                    dateFilter.createdAt.gte = filters.startDate;
                if (filters?.endDate)
                    dateFilter.createdAt.lte = filters.endDate;
            }
            const [totalUsers, totalVendors, totalCustomers, totalOrders, pendingVendors, pendingCertifications, totalRentalSpaces, totalRevenueResult, recentOrders, recentUsers] = await Promise.all([
                prisma_1.default.user.count({ where: { deletedAt: null } }),
                prisma_1.default.vendorProfile.count(),
                prisma_1.default.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
                prisma_1.default.order.count(),
                prisma_1.default.vendorProfile.count({ where: { certificationStatus: 'PENDING' } }),
                prisma_1.default.sustainabilityCert.count({ where: { verificationStatus: 'PENDING' } }),
                prisma_1.default.rentalSpace.count(),
                prisma_1.default.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalPrice: true } }),
                prisma_1.default.order.findMany({
                    take: 10,
                    orderBy: { orderDate: 'desc' },
                    include: { user: { select: { name: true, email: true } } }
                }),
                prisma_1.default.user.findMany({
                    where: { deletedAt: null },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, name: true, email: true, role: true, createdAt: true }
                })
            ]);
            const response = {
                totalUsers, totalVendors, totalCustomers, totalOrders,
                totalRevenue: Number(totalRevenueResult._sum.totalPrice || 0),
                pendingVendors, pendingCertifications, pendingRentalSpaces: 0,
                recentOrders: recentOrders.map(order => ({
                    id: order.id,
                    totalPrice: Number(order.totalPrice),
                    status: order.status,
                    orderDate: order.orderDate,
                    user: { name: order.user?.name || 'Unknown', email: order.user?.email || 'Unknown' }
                })),
                recentUsers: recentUsers.map(user => ({
                    id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt
                }))
            };
            await redis_cache_service_1.default.setFast(cacheKey, response, 300);
            return response;
        }
        catch (error) {
            console.error('Error in getDashboardStats:', error);
            throw new Error('Failed to fetch dashboard statistics');
        }
    }
    static async getAllUsers(queryParams = {}) {
        try {
            const cacheKey = `admin:users:${JSON.stringify(queryParams)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached)
                return cached;
            const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('User', {
                page: queryParams.page, limit: queryParams.limit,
                sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder,
                searchTerm: queryParams.searchTerm,
                role: queryParams.role, status: queryParams.status
            });
            queryBuilder.setSearchFields(['name', 'email']);
            queryBuilder.addCustomCondition(client_1.Prisma.sql `"deletedAt" IS NULL`);
            const customQuery = client_1.Prisma.sql `
                SELECT u.id, u.name, u.email, u.role, u.status, u."phoneNumber", u."createdAt",
                       vp.id as vendor_id, vp."farmName", vp."certificationStatus"
                FROM "User" u
                LEFT JOIN "VendorProfile" vp ON u.id = vp."userId"
            `;
            const result = await queryBuilder.execute(customQuery);
            const transformedUsers = result.data.map((user) => ({
                id: user.id, name: user.name, email: user.email, role: user.role,
                status: user.status, phoneNumber: user.phoneNumber, createdAt: user.createdAt,
                vendorProfile: user.vendor_id ? {
                    farmName: user.farmName, certificationStatus: user.certificationStatus
                } : null
            }));
            const response = { data: transformedUsers, meta: result.meta };
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            console.error('Error in getAllUsers:', error);
            throw new Error('Failed to fetch users');
        }
    }
    static async updateUserStatus(userId, status) {
        try {
            const user = await prisma_1.default.user.update({
                where: { id: userId },
                data: { status: status, updatedAt: new Date() },
                select: { id: true, name: true, email: true, status: true }
            });
            await prisma_1.default.$executeRaw `
                INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
                VALUES (${userId}, 'Account Status Updated', ${`Your account has been ${status.toLowerCase()}`}, 'SYSTEM', false, NOW(), NOW())
            `;
            await socket_service_1.default.sendNotification(userId, 'Account Status Updated', `Your account has been ${status.toLowerCase()}`, 'SYSTEM');
            await Promise.all([
                redis_cache_service_1.default.delPattern('admin:users:*'),
                redis_cache_service_1.default.delPattern('admin:dashboard:*'),
                redis_cache_service_1.default.del(`user:${userId}`)
            ]);
            return user;
        }
        catch (error) {
            console.error('Error in updateUserStatus:', error);
            throw new Error('Failed to update user status');
        }
    }
    static async deleteUser(userId) {
        try {
            await prisma_1.default.user.update({
                where: { id: userId },
                data: { deletedAt: new Date(), status: 'INACTIVE', updatedAt: new Date() }
            });
            await Promise.all([
                redis_cache_service_1.default.delPattern('admin:users:*'),
                redis_cache_service_1.default.delPattern('admin:dashboard:*'),
                redis_cache_service_1.default.del(`user:${userId}`)
            ]);
            return { message: 'User deleted successfully' };
        }
        catch (error) {
            console.error('Error in deleteUser:', error);
            throw new Error('Failed to delete user');
        }
    }
    static async getAllVendors(queryParams = {}) {
        try {
            const cacheKey = `admin:vendors:${JSON.stringify(queryParams)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached)
                return cached;
            const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('VendorProfile', {
                page: queryParams.page, limit: queryParams.limit,
                sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder,
                searchTerm: queryParams.searchTerm,
                certificationStatus: queryParams.certificationStatus
            });
            queryBuilder.setSearchFields(['farmName', 'farmLocation']);
            const customQuery = client_1.Prisma.sql `
                SELECT vp.id, vp."farmName", vp."farmLocation", vp."certificationStatus", vp."createdAt",
                       u.id as user_id, u.name as user_name, u.email as user_email, u."phoneNumber" as user_phone,
                       (SELECT COUNT(*) FROM "Produce" WHERE "vendorId" = vp.id) as total_products,
                       (SELECT COUNT(*) FROM "Order" WHERE "vendorId" = vp.id) as total_orders,
                       (SELECT COALESCE(SUM("totalPrice"), 0) FROM "Order" WHERE "vendorId" = vp.id AND status = 'COMPLETED') as total_revenue
                FROM "VendorProfile" vp
                LEFT JOIN "User" u ON vp."userId" = u.id
            `;
            const result = await queryBuilder.execute(customQuery);
            const transformedVendors = result.data.map((vendor) => ({
                id: vendor.id, farmName: vendor.farmName, farmLocation: vendor.farmLocation,
                certificationStatus: vendor.certificationStatus,
                user: { name: vendor.user_name, email: vendor.user_email, phoneNumber: vendor.user_phone || undefined },
                totalProducts: Number(vendor.total_products) || 0,
                totalOrders: Number(vendor.total_orders) || 0,
                totalRevenue: Number(vendor.total_revenue) || 0,
                createdAt: vendor.createdAt,
            }));
            const response = { data: transformedVendors, meta: result.meta };
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            console.error('Error in getAllVendors:', error);
            throw new Error('Failed to fetch vendors');
        }
    }
    static async verifyVendor(vendorId, status, rejectionReason) {
        try {
            const vendor = await prisma_1.default.vendorProfile.update({
                where: { id: vendorId },
                data: { certificationStatus: status, updatedAt: new Date() },
                select: { id: true, userId: true, certificationStatus: true }
            });
            const title = status === 'APPROVED' ? 'Vendor Approved' : 'Vendor Rejected';
            const message = status === 'APPROVED'
                ? 'Your vendor account has been approved!'
                : `Your vendor account was rejected. Reason: ${rejectionReason || 'No reason provided'}`;
            await prisma_1.default.$executeRaw `
                INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
                VALUES (${vendor.userId}, ${title}, ${message}, 'SYSTEM', false, NOW(), NOW())
            `;
            await socket_service_1.default.sendCertificationNotification(vendor.userId, {
                vendorId: vendor.id,
                status: status,
                message: message,
                timestamp: new Date()
            });
            await Promise.all([
                redis_cache_service_1.default.delPattern('admin:vendors:*'),
                redis_cache_service_1.default.delPattern('admin:dashboard:*'),
                redis_cache_service_1.default.del(`vendor:profile:${vendor.userId}`)
            ]);
            return vendor;
        }
        catch (error) {
            console.error('Error in verifyVendor:', error);
            throw new Error('Failed to verify vendor');
        }
    }
    static async getAllCertifications(queryParams = {}) {
        try {
            const cacheKey = `admin:certifications:${JSON.stringify(queryParams)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached)
                return cached;
            const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('SustainabilityCert', {
                page: queryParams.page, limit: queryParams.limit,
                sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder,
                verificationStatus: queryParams.verificationStatus,
                vendorId: queryParams.vendorId
            });
            const customQuery = client_1.Prisma.sql `
                SELECT sc.id, sc."certifyingAgency", sc."certificationDate", sc."expiryDate", 
                       sc."verificationStatus", sc."createdAt",
                       vp.id as vendor_id, vp."farmName",
                       u.name as user_name, u.email as user_email
                FROM "SustainabilityCert" sc
                LEFT JOIN "VendorProfile" vp ON sc."vendorId" = vp.id
                LEFT JOIN "User" u ON vp."userId" = u.id
            `;
            const result = await queryBuilder.execute(customQuery);
            const transformedCerts = result.data.map((cert) => ({
                id: cert.id, certifyingAgency: cert.certifyingAgency,
                certificationDate: cert.certificationDate, expiryDate: cert.expiryDate,
                verificationStatus: cert.verificationStatus,
                vendor: { farmName: cert.farmName, user: { name: cert.user_name, email: cert.user_email } },
                createdAt: cert.createdAt,
            }));
            const response = { data: transformedCerts, meta: result.meta };
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            console.error('Error in getAllCertifications:', error);
            throw new Error('Failed to fetch certifications');
        }
    }
    static async verifyCertification(certId, status, verificationNotes) {
        try {
            await prisma_1.default.$executeRaw `
                UPDATE "SustainabilityCert"
                SET "verificationStatus" = ${status}::"CertificationStatus", "verifiedAt" = NOW(), "updatedAt" = NOW()
                WHERE id = ${certId}
            `;
            const updatedCert = await prisma_1.default.sustainabilityCert.findUnique({
                where: { id: certId },
                select: { id: true, vendorId: true, verificationStatus: true }
            });
            if (!updatedCert)
                throw new Error('Certification not found');
            if (status === 'APPROVED') {
                await prisma_1.default.$executeRaw `
                    UPDATE "VendorProfile"
                    SET "certificationStatus" = 'APPROVED'::"CertificationStatus", "updatedAt" = NOW()
                    WHERE id = ${updatedCert.vendorId}
                `;
            }
            else if (status === 'REJECTED') {
                await prisma_1.default.$executeRaw `
                    UPDATE "VendorProfile"
                    SET "certificationStatus" = 'REJECTED'::"CertificationStatus", "updatedAt" = NOW()
                    WHERE id = ${updatedCert.vendorId}
                `;
            }
            const vendor = await prisma_1.default.$queryRaw `
                SELECT "userId" FROM "VendorProfile" WHERE id = ${updatedCert.vendorId} LIMIT 1
            `;
            const title = status === 'APPROVED' ? 'Certification Approved' : 'Certification Rejected';
            const message = `Your sustainability certification has been ${status.toLowerCase()}`;
            await prisma_1.default.$executeRaw `
                INSERT INTO "Notification" ("userId", title, message, type, "isRead", "createdAt", "updatedAt")
                VALUES (${vendor[0].userId}, ${title}, ${message}, 'CERTIFICATION', false, NOW(), NOW())
            `;
            await socket_service_1.default.sendCertificationNotification(vendor[0].userId, {
                vendorId: updatedCert.vendorId,
                status: status,
                message: message,
                timestamp: new Date()
            });
            await Promise.all([
                redis_cache_service_1.default.delPattern('admin:certifications:*'),
                redis_cache_service_1.default.delPattern('admin:vendors:*'),
                redis_cache_service_1.default.delPattern('admin:dashboard:*')
            ]);
            return updatedCert;
        }
        catch (error) {
            console.error('Error in verifyCertification:', error);
            throw new Error('Failed to verify certification');
        }
    }
    static async getAllRentalSpaces(queryParams = {}) {
        try {
            const cacheKey = `admin:rental-spaces:${JSON.stringify(queryParams)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached)
                return cached;
            const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('RentalSpace', {
                page: queryParams.page, limit: queryParams.limit,
                sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder,
                searchTerm: queryParams.searchTerm
            });
            const customQuery = client_1.Prisma.sql `
                SELECT rs.id, rs."vendorId", rs.location, rs.size, rs.price, rs.availability,
                       rs."createdAt", rs."updatedAt", vp."farmName",
                       u.name as user_name, u.email as user_email,
                       (SELECT COUNT(*) FROM "RentalBooking" WHERE "spaceId" = rs.id) as bookings_count
                FROM "RentalSpace" rs
                LEFT JOIN "VendorProfile" vp ON rs."vendorId" = vp.id
                LEFT JOIN "User" u ON vp."userId" = u.id
            `;
            const result = await queryBuilder.execute(customQuery);
            const transformedSpaces = result.data.map((space) => ({
                id: space.id, vendorId: space.vendorId, location: space.location,
                size: Number(space.size), price: Number(space.price), availability: space.availability,
                createdAt: space.createdAt, updatedAt: space.updatedAt,
                vendor: { farmName: space.farmName, user: { name: space.user_name, email: space.user_email } },
                bookingsCount: Number(space.bookings_count) || 0,
            }));
            const response = { data: transformedSpaces, meta: result.meta };
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            console.error('Error in getAllRentalSpaces:', error);
            throw new Error('Failed to fetch rental spaces');
        }
    }
    static async getAllOrders(queryParams = {}) {
        try {
            const cacheKey = `admin:orders:${JSON.stringify(queryParams)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached)
                return cached;
            const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('Order', {
                page: queryParams.page, limit: queryParams.limit,
                sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder,
                status: queryParams.status
            });
            if (queryParams.minAmount !== undefined) {
                queryBuilder.addCustomCondition(client_1.Prisma.sql `"totalPrice" >= ${queryParams.minAmount}`);
            }
            if (queryParams.maxAmount !== undefined) {
                queryBuilder.addCustomCondition(client_1.Prisma.sql `"totalPrice" <= ${queryParams.maxAmount}`);
            }
            const customQuery = client_1.Prisma.sql `
                SELECT o.id, o.quantity, o."totalPrice", o.status, o."orderDate",
                       u.id as user_id, u.name as user_name, u.email as user_email,
                       p.id as produce_id, p.name as produce_name,
                       vp."farmName" as vendor_farmName
                FROM "Order" o
                LEFT JOIN "User" u ON o."userId" = u.id
                LEFT JOIN "Produce" p ON o."produceId" = p.id
                LEFT JOIN "VendorProfile" vp ON o."vendorId" = vp.id
            `;
            const result = await queryBuilder.execute(customQuery);
            const transformedOrders = result.data.map((order) => ({
                id: order.id, quantity: order.quantity, totalPrice: Number(order.totalPrice),
                status: order.status, orderDate: order.orderDate,
                user: { name: order.user_name, email: order.user_email },
                produce: { name: order.produce_name },
                vendor: { farmName: order.vendor_farmName },
            }));
            const response = { data: transformedOrders, meta: result.meta };
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            console.error('Error in getAllOrders:', error);
            throw new Error('Failed to fetch orders');
        }
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map