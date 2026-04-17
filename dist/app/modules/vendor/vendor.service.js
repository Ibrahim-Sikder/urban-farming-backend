"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const prisma_query_builder_1 = require("../../shared/utils/prisma-query-builder");
class VendorService {
    static async getVendorProfile(userId) {
        const cacheKey = `vendor:profile:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const vendor = await prisma_1.default.$queryRaw `
            SELECT 
                vp.id,
                vp."farmName",
                vp."farmLocation",
                vp."certificationStatus",
                vp."createdAt",
                vp."updatedAt",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u."phoneNumber" as user_phone,
                u.address as user_address
            FROM "VendorProfile" vp
            LEFT JOIN "User" u ON vp."userId" = u.id
            WHERE vp."userId" = ${userId}
            LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorData = vendor[0];
        const stats = await prisma_1.default.$queryRaw `
            SELECT 
                (SELECT COUNT(*) FROM "Produce" WHERE "vendorId" = ${vendorData.id}) as totalProducts,
                (SELECT COUNT(*) FROM "RentalSpace" WHERE "vendorId" = ${vendorData.id}) as totalRentalSpaces,
                (SELECT COUNT(*) FROM "RentalSpace" WHERE "vendorId" = ${vendorData.id} AND availability = true) as availableSpaces,
                (SELECT COUNT(*) FROM "Order" WHERE "vendorId" = ${vendorData.id}) as totalOrders,
                (SELECT COUNT(*) FROM "Order" WHERE "vendorId" = ${vendorData.id} AND status = 'PENDING') as pendingOrders,
                (SELECT COUNT(*) FROM "Order" WHERE "vendorId" = ${vendorData.id} AND status = 'COMPLETED') as completedOrders,
                (SELECT COALESCE(SUM("totalPrice"), 0) FROM "Order" WHERE "vendorId" = ${vendorData.id} AND status = 'COMPLETED') as totalRevenue
        `;
        const statsData = stats[0];
        const produce = await prisma_1.default.$queryRaw `
            SELECT id, name, description, price, category, "certificationStatus", "availableQuantity", "createdAt", "updatedAt"
            FROM "Produce"
            WHERE "vendorId" = ${vendorData.id}
            ORDER BY "createdAt" DESC
            LIMIT 10
        `;
        const rentalSpaces = await prisma_1.default.$queryRaw `
            SELECT id, location, size, price, availability, "createdAt", "updatedAt"
            FROM "RentalSpace"
            WHERE "vendorId" = ${vendorData.id}
            ORDER BY "createdAt" DESC
            LIMIT 10
        `;
        const cert = await prisma_1.default.$queryRaw `
            SELECT id, "certifyingAgency", "certificationDate", "expiryDate", "documentUrl", "verificationStatus"
            FROM "SustainabilityCert"
            WHERE "vendorId" = ${vendorData.id}
            LIMIT 1
        `;
        const response = {
            id: vendorData.id,
            farmName: vendorData.farmName,
            farmLocation: vendorData.farmLocation,
            certificationStatus: vendorData.certificationStatus,
            user: {
                id: vendorData.user_id,
                name: vendorData.user_name,
                email: vendorData.user_email,
                phoneNumber: vendorData.user_phone || undefined,
                address: vendorData.user_address || undefined,
            },
            stats: {
                totalProducts: Number(statsData.totalproducts) || 0,
                totalRentalSpaces: Number(statsData.totalrentalspaces) || 0,
                availableSpaces: Number(statsData.availablespaces) || 0,
                totalOrders: Number(statsData.totalorders) || 0,
                pendingOrders: Number(statsData.pendingorders) || 0,
                completedOrders: Number(statsData.completedorders) || 0,
                totalRevenue: Number(statsData.totalrevenue) || 0,
            },
            produce: produce,
            rentalSpaces: rentalSpaces,
            sustainabilityCert: cert[0] || null,
            createdAt: vendorData.createdAt,
            updatedAt: vendorData.updatedAt,
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async updateVendorProfile(userId, data) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        await prisma_1.default.$executeRaw `
            UPDATE "VendorProfile"
            SET 
                "farmName" = COALESCE(${data.farmName}, "farmName"),
                "farmLocation" = COALESCE(${data.farmLocation}, "farmLocation"),
                "updatedAt" = NOW()
            WHERE "userId" = ${userId}
        `;
        await redis_cache_service_1.default.del(`vendor:profile:${userId}`);
        return { message: 'Vendor profile updated successfully' };
    }
    static async createProduce(userId, data) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id, "certificationStatus" FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorData = vendor[0];
        const produce = await prisma_1.default.$queryRaw `
            INSERT INTO "Produce" ("vendorId", name, description, price, category, "availableQuantity", "certificationStatus", "createdAt", "updatedAt")
            VALUES (${vendorData.id}, ${data.name}, ${data.description}, ${data.price}, ${data.category}, ${data.availableQuantity}, ${vendorData.certificationStatus}, NOW(), NOW())
            RETURNING id, name, description, price, category, "certificationStatus", "availableQuantity", "createdAt", "updatedAt"
        `;
        await redis_cache_service_1.default.del(`vendor:profile:${userId}`);
        await redis_cache_service_1.default.delPattern(`vendor:produce:${userId}:*`);
        return produce[0];
    }
    static async getVendorProduce(userId, queryParams = {}) {
        const cacheKey = `vendor:produce:${userId}:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('Produce', queryParams);
        queryBuilder.setSearchFields(['name', 'description', 'category']);
        const vendorCondition = client_1.Prisma.sql `"vendorId" = ${vendorId}`;
        queryBuilder.addCustomCondition(vendorCondition);
        const conditions = [];
        if (queryParams.minPrice !== undefined) {
            conditions.push(client_1.Prisma.sql `price >= ${queryParams.minPrice}`);
        }
        if (queryParams.maxPrice !== undefined) {
            conditions.push(client_1.Prisma.sql `price <= ${queryParams.maxPrice}`);
        }
        if (queryParams.category) {
            conditions.push(client_1.Prisma.sql `category = ${queryParams.category}`);
        }
        if (queryParams.certificationStatus) {
            conditions.push(client_1.Prisma.sql `"certificationStatus" = ${queryParams.certificationStatus}`);
        }
        if (conditions.length > 0) {
            const combinedCondition = client_1.Prisma.sql `${client_1.Prisma.join(conditions, ' AND ')}`;
            queryBuilder.addCustomCondition(combinedCondition);
        }
        const customQuery = client_1.Prisma.sql `
            SELECT 
                id, name, description, price, category, 
                "certificationStatus", "availableQuantity", 
                "createdAt", "updatedAt"
            FROM "Produce"
        `;
        const result = await queryBuilder.execute(customQuery);
        await redis_cache_service_1.default.setFast(cacheKey, result, 120);
        return result;
    }
    static async updateProduce(userId, produceId, data) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const existing = await prisma_1.default.$queryRaw `
            SELECT id FROM "Produce" WHERE id = ${produceId} AND "vendorId" = ${vendorId} LIMIT 1
        `;
        if (!existing || existing.length === 0) {
            throw new Error('Produce not found');
        }
        const updated = await prisma_1.default.$queryRaw `
            UPDATE "Produce"
            SET 
                name = COALESCE(${data.name}, name),
                description = COALESCE(${data.description}, description),
                price = COALESCE(${data.price}, price),
                category = COALESCE(${data.category}, category),
                "availableQuantity" = COALESCE(${data.availableQuantity}, "availableQuantity"),
                "updatedAt" = NOW()
            WHERE id = ${produceId}
            RETURNING id, name, description, price, category, "certificationStatus", "availableQuantity", "createdAt", "updatedAt"
        `;
        await Promise.all([
            redis_cache_service_1.default.del(`vendor:profile:${userId}`),
            redis_cache_service_1.default.delPattern(`vendor:produce:${userId}:*`),
            redis_cache_service_1.default.del(`produce:${produceId}`)
        ]);
        return updated[0];
    }
    static async deleteProduce(userId, produceId) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const orders = await prisma_1.default.$queryRaw `
            SELECT id FROM "Order" WHERE "produceId" = ${produceId} LIMIT 1
        `;
        if (orders && orders.length > 0) {
            throw new Error('Cannot delete produce with existing orders');
        }
        await prisma_1.default.$executeRaw `
            DELETE FROM "Produce" WHERE id = ${produceId} AND "vendorId" = ${vendorId}
        `;
        await Promise.all([
            redis_cache_service_1.default.del(`vendor:profile:${userId}`),
            redis_cache_service_1.default.delPattern(`vendor:produce:${userId}:*`),
            redis_cache_service_1.default.del(`produce:${produceId}`)
        ]);
        return { message: 'Produce deleted successfully' };
    }
    static async createRentalSpace(userId, data) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const space = await prisma_1.default.$queryRaw `
            INSERT INTO "RentalSpace" ("vendorId", location, size, price, availability, "createdAt", "updatedAt")
            VALUES (${vendorId}, ${data.location}, ${data.size}, ${data.price}, true, NOW(), NOW())
            RETURNING id, "vendorId", location, size, price, availability, "createdAt", "updatedAt"
        `;
        await Promise.all([
            redis_cache_service_1.default.del(`vendor:profile:${userId}`),
            redis_cache_service_1.default.delPattern('rental:spaces:*')
        ]);
        return space[0];
    }
    static async getVendorRentalSpaces(userId) {
        const cacheKey = `vendor:rental:spaces:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const spaces = await prisma_1.default.$queryRaw `
            SELECT 
                rs.id,
                rs.location,
                rs.size,
                rs.price,
                rs.availability,
                rs."createdAt",
                rs."updatedAt",
                COUNT(rb.id) as bookings_count
            FROM "RentalSpace" rs
            LEFT JOIN "RentalBooking" rb ON rs.id = rb."spaceId"
            WHERE rs."vendorId" = ${vendorId}
            GROUP BY rs.id
            ORDER BY rs."createdAt" DESC
        `;
        await redis_cache_service_1.default.setFast(cacheKey, spaces, 300);
        return spaces;
    }
    static async updateRentalSpace(userId, spaceId, data) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const updated = await prisma_1.default.$queryRaw `
            UPDATE "RentalSpace"
            SET 
                location = COALESCE(${data.location}, location),
                size = COALESCE(${data.size}, size),
                price = COALESCE(${data.price}, price),
                availability = COALESCE(${data.availability}, availability),
                "updatedAt" = NOW()
            WHERE id = ${spaceId} AND "vendorId" = ${vendorId}
            RETURNING id, "vendorId", location, size, price, availability, "createdAt", "updatedAt"
        `;
        await Promise.all([
            redis_cache_service_1.default.del(`vendor:profile:${userId}`),
            redis_cache_service_1.default.del(`vendor:rental:spaces:${userId}`),
            redis_cache_service_1.default.delPattern('rental:spaces:*'),
            redis_cache_service_1.default.del(`rental:space:${spaceId}`)
        ]);
        return updated[0];
    }
    static async deleteRentalSpace(userId, spaceId) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const bookings = await prisma_1.default.$queryRaw `
            SELECT id FROM "RentalBooking" WHERE "spaceId" = ${spaceId} LIMIT 1
        `;
        if (bookings && bookings.length > 0) {
            throw new Error('Cannot delete space with existing bookings');
        }
        await prisma_1.default.$executeRaw `
            DELETE FROM "RentalSpace" WHERE id = ${spaceId} AND "vendorId" = ${vendorId}
        `;
        await Promise.all([
            redis_cache_service_1.default.del(`vendor:profile:${userId}`),
            redis_cache_service_1.default.del(`vendor:rental:spaces:${userId}`),
            redis_cache_service_1.default.delPattern('rental:spaces:*'),
            redis_cache_service_1.default.del(`rental:space:${spaceId}`)
        ]);
        return { message: 'Rental space deleted successfully' };
    }
    static async submitCertification(userId, data) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const existingCert = await prisma_1.default.$queryRaw `
            SELECT id FROM "SustainabilityCert" WHERE "vendorId" = ${vendorId} LIMIT 1
        `;
        if (existingCert && existingCert.length > 0) {
            throw new Error('Certification already submitted');
        }
        await prisma_1.default.$executeRaw `
            INSERT INTO "SustainabilityCert" ("vendorId", "certifyingAgency", "certificationDate", "expiryDate", "documentUrl", "verificationStatus", "createdAt", "updatedAt")
            VALUES (${vendorId}, ${data.certifyingAgency}, ${data.certificationDate}, ${data.expiryDate}, ${data.documentUrl}, 'PENDING', NOW(), NOW())
        `;
        await redis_cache_service_1.default.del(`vendor:profile:${userId}`);
        return { message: 'Certification submitted successfully' };
    }
    static async getCertificationStatus(userId) {
        const cacheKey = `vendor:cert:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const vendor = await prisma_1.default.$queryRaw `
            SELECT 
                vp."certificationStatus",
                sc.id,
                sc."certifyingAgency",
                sc."certificationDate",
                sc."expiryDate",
                sc."verificationStatus"
            FROM "VendorProfile" vp
            LEFT JOIN "SustainabilityCert" sc ON vp.id = sc."vendorId"
            WHERE vp."userId" = ${userId}
            LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const result = {
            certificationStatus: vendor[0].certificationStatus,
            certification: vendor[0].id ? {
                id: vendor[0].id,
                certifyingAgency: vendor[0].certifyingAgency,
                certificationDate: vendor[0].certificationDate,
                expiryDate: vendor[0].expiryDate,
                verificationStatus: vendor[0].verificationStatus,
            } : null,
        };
        await redis_cache_service_1.default.setFast(cacheKey, result, 300);
        return result;
    }
    static async getVendorOrders(userId, queryParams = {}) {
        const cacheKey = `vendor:orders:${userId}:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('Order', queryParams);
        const vendorCondition = client_1.Prisma.sql `"vendorId" = ${vendorId}`;
        queryBuilder.addCustomCondition(vendorCondition);
        if (queryParams.status) {
            const statusCondition = client_1.Prisma.sql `status = ${queryParams.status}`;
            queryBuilder.addCustomCondition(statusCondition);
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
                p.name as produce_name
            FROM "Order" o
            LEFT JOIN "User" u ON o."userId" = u.id
            LEFT JOIN "Produce" p ON o."produceId" = p.id
        `;
        const result = await queryBuilder.execute(customQuery);
        const transformedData = result.data.map((order) => ({
            id: order.id,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            status: order.status,
            orderDate: order.orderDate,
            user: {
                id: order.user_id,
                name: order.user_name,
                email: order.user_email,
            },
            produce: {
                id: order.produce_id,
                name: order.produce_name,
            },
        }));
        const response = {
            data: transformedData,
            meta: result.meta
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async updateOrderStatus(userId, orderId, data) {
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        await prisma_1.default.$executeRaw `
            UPDATE "Order"
            SET status = ${data.status}, "updatedAt" = NOW()
            WHERE id = ${orderId} AND "vendorId" = ${vendorId}
        `;
        await Promise.all([
            redis_cache_service_1.default.delPattern(`vendor:orders:${userId}:*`),
            redis_cache_service_1.default.del(`order:${orderId}`)
        ]);
        return { message: 'Order status updated successfully' };
    }
    static async getVendorBookings(userId) {
        const cacheKey = `vendor:bookings:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const bookings = await prisma_1.default.$queryRaw `
            SELECT 
                rb.id,
                rb."spaceId",
                rb."startDate",
                rb."endDate",
                rb.status,
                rb."orderDate",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                rs.location as space_location,
                rs.size as space_size,
                rs.price as space_price
            FROM "RentalBooking" rb
            LEFT JOIN "RentalSpace" rs ON rb."spaceId" = rs.id
            LEFT JOIN "User" u ON rb."userId" = u.id
            WHERE rs."vendorId" = ${vendorId}
            ORDER BY rb."orderDate" DESC
        `;
        const transformedBookings = bookings.map((booking) => ({
            id: booking.id,
            spaceId: booking.spaceId,
            startDate: booking.startDate,
            endDate: booking.endDate,
            status: booking.status,
            orderDate: booking.orderDate,
            user: {
                id: booking.user_id,
                name: booking.user_name,
                email: booking.user_email,
            },
            space: {
                location: booking.space_location,
                size: Number(booking.space_size),
                price: Number(booking.space_price),
            },
        }));
        await redis_cache_service_1.default.setFast(cacheKey, transformedBookings, 300);
        return transformedBookings;
    }
    static async getRevenueReport(userId) {
        const cacheKey = `vendor:revenue:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const vendor = await prisma_1.default.$queryRaw `
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }
        const vendorId = vendor[0].id;
        const report = await prisma_1.default.$queryRaw `
            SELECT 
                COALESCE(SUM(o."totalPrice"), 0) as totalRevenue,
                COUNT(o.id) as totalOrders,
                COALESCE(AVG(o."totalPrice"), 0) as averageOrderValue,
                json_agg(json_build_object(
                    'productId', p.id,
                    'productName', p.name,
                    'quantitySold', o.quantity,
                    'revenue', o."totalPrice"
                )) as topProducts
            FROM "Order" o
            LEFT JOIN "Produce" p ON o."produceId" = p.id
            WHERE o."vendorId" = ${vendorId} AND o.status = 'COMPLETED'
            GROUP BY o."vendorId"
        `;
        const result = report[0] || {
            totalRevenue: 0,
            totalOrders: 0,
            averageOrderValue: 0,
            topproducts: []
        };
        const response = {
            totalRevenue: Number(result.totalrevenue) || 0,
            totalOrders: Number(result.totalorders) || 0,
            averageOrderValue: Number(result.averageordervalue) || 0,
            topProducts: result.topproducts || [],
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
}
exports.VendorService = VendorService;
//# sourceMappingURL=vendor.service.js.map