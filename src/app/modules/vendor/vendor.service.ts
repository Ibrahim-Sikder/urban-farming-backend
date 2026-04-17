import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import { PrismaQueryBuilder } from '../../shared/utils/prisma-query-builder';
import { CertificationStatus } from '@prisma/client';
import {
    UpdateVendorProfileInput,
    CreateProduceInput,
    UpdateProduceInput,
    CreateRentalSpaceInput,
    UpdateRentalSpaceInput,
    SubmitCertificationInput,
    UpdateOrderStatusInput,
    VendorProduceQueryParams,
    VendorOrderQueryParams,
    VendorProfileResponse,
    VendorProduceResponse,
    VendorOrderResponse,
    VendorBookingResponse,
    RevenueReportResponse,
    MessageResponse,
    PaginatedResponse
} from './vendor.type';

export class VendorService {

    // ============ PROFILE MANAGEMENT ============

    static async getVendorProfile(userId: number): Promise<VendorProfileResponse> {
        const cacheKey = `vendor:profile:${userId}`;

        // Try cache
        const cached = await RedisCacheService.getFast<VendorProfileResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const vendor = await prisma.$queryRaw<any[]>`
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

        // Get stats
        const stats = await prisma.$queryRaw<any[]>`
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

        // Get recent produce
        const produce = await prisma.$queryRaw<any[]>`
            SELECT id, name, description, price, category, "certificationStatus", "availableQuantity", "createdAt", "updatedAt"
            FROM "Produce"
            WHERE "vendorId" = ${vendorData.id}
            ORDER BY "createdAt" DESC
            LIMIT 10
        `;

        // Get recent rental spaces
        const rentalSpaces = await prisma.$queryRaw<any[]>`
            SELECT id, location, size, price, availability, "createdAt", "updatedAt"
            FROM "RentalSpace"
            WHERE "vendorId" = ${vendorData.id}
            ORDER BY "createdAt" DESC
            LIMIT 10
        `;

        // Get certification
        const cert = await prisma.$queryRaw<any[]>`
            SELECT id, "certifyingAgency", "certificationDate", "expiryDate", "documentUrl", "verificationStatus"
            FROM "SustainabilityCert"
            WHERE "vendorId" = ${vendorData.id}
            LIMIT 1
        `;

        const response: VendorProfileResponse = {
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

        // Cache for 5 minutes
        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }

    static async updateVendorProfile(userId: number, data: UpdateVendorProfileInput): Promise<MessageResponse> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        await prisma.$executeRaw`
            UPDATE "VendorProfile"
            SET 
                "farmName" = COALESCE(${data.farmName}, "farmName"),
                "farmLocation" = COALESCE(${data.farmLocation}, "farmLocation"),
                "updatedAt" = NOW()
            WHERE "userId" = ${userId}
        `;

        // Clear cache
        await RedisCacheService.del(`vendor:profile:${userId}`);

        return { message: 'Vendor profile updated successfully' };
    }

    // ============ PRODUCE MANAGEMENT WITH QUERY BUILDER ============

    static async createProduce(userId: number, data: CreateProduceInput): Promise<VendorProduceResponse> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id, "certificationStatus" FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorData = vendor[0];

        const produce = await prisma.$queryRaw<any[]>`
            INSERT INTO "Produce" ("vendorId", name, description, price, category, "availableQuantity", "certificationStatus", "createdAt", "updatedAt")
            VALUES (${vendorData.id}, ${data.name}, ${data.description}, ${data.price}, ${data.category}, ${data.availableQuantity}, ${vendorData.certificationStatus}, NOW(), NOW())
            RETURNING id, name, description, price, category, "certificationStatus", "availableQuantity", "createdAt", "updatedAt"
        `;

        // Clear vendor profile cache
        await RedisCacheService.del(`vendor:profile:${userId}`);
        await RedisCacheService.delPattern(`vendor:produce:${userId}:*`);

        return produce[0] as VendorProduceResponse;
    }

    static async getVendorProduce(
        userId: number,
        queryParams: VendorProduceQueryParams = {}
    ): Promise<PaginatedResponse<VendorProduceResponse>> {
        const cacheKey = `vendor:produce:${userId}:${JSON.stringify(queryParams)}`;

        // Try cache
        const cached = await RedisCacheService.getFast<PaginatedResponse<VendorProduceResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        // Get vendor ID
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        // Build query using reusable query builder
        const queryBuilder = new PrismaQueryBuilder('Produce', queryParams as any);

        // Set searchable fields
        queryBuilder.setSearchFields(['name', 'description', 'category']);

        // Add vendor filter
        const vendorCondition = Prisma.sql`"vendorId" = ${vendorId}`;
        queryBuilder.addCustomCondition(vendorCondition);

        // Add price range filters
        const conditions: Prisma.Sql[] = [];
        if (queryParams.minPrice !== undefined) {
            conditions.push(Prisma.sql`price >= ${queryParams.minPrice}`);
        }
        if (queryParams.maxPrice !== undefined) {
            conditions.push(Prisma.sql`price <= ${queryParams.maxPrice}`);
        }
        if (queryParams.category) {
            conditions.push(Prisma.sql`category = ${queryParams.category}`);
        }
        if (queryParams.certificationStatus) {
            conditions.push(Prisma.sql`"certificationStatus" = ${queryParams.certificationStatus}`);
        }

        if (conditions.length > 0) {
            const combinedCondition = Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
            queryBuilder.addCustomCondition(combinedCondition);
        }

        // Custom query
        const customQuery = Prisma.sql`
            SELECT 
                id, name, description, price, category, 
                "certificationStatus", "availableQuantity", 
                "createdAt", "updatedAt"
            FROM "Produce"
        `;

        const result = await queryBuilder.execute<VendorProduceResponse>(customQuery);

        // Cache for 2 minutes
        await RedisCacheService.setFast(cacheKey, result, 120);

        return result;
    }

    static async updateProduce(userId: number, produceId: number, data: UpdateProduceInput): Promise<VendorProduceResponse> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        // Check if produce belongs to vendor
        const existing = await prisma.$queryRaw<any[]>`
            SELECT id FROM "Produce" WHERE id = ${produceId} AND "vendorId" = ${vendorId} LIMIT 1
        `;

        if (!existing || existing.length === 0) {
            throw new Error('Produce not found');
        }

        const updated = await prisma.$queryRaw<any[]>`
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

        // Clear caches
        await Promise.all([
            RedisCacheService.del(`vendor:profile:${userId}`),
            RedisCacheService.delPattern(`vendor:produce:${userId}:*`),
            RedisCacheService.del(`produce:${produceId}`)
        ]);

        return updated[0] as VendorProduceResponse;
    }

    static async deleteProduce(userId: number, produceId: number): Promise<MessageResponse> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        // Check if produce has orders
        const orders = await prisma.$queryRaw<any[]>`
            SELECT id FROM "Order" WHERE "produceId" = ${produceId} LIMIT 1
        `;

        if (orders && orders.length > 0) {
            throw new Error('Cannot delete produce with existing orders');
        }

        await prisma.$executeRaw`
            DELETE FROM "Produce" WHERE id = ${produceId} AND "vendorId" = ${vendorId}
        `;

        // Clear caches
        await Promise.all([
            RedisCacheService.del(`vendor:profile:${userId}`),
            RedisCacheService.delPattern(`vendor:produce:${userId}:*`),
            RedisCacheService.del(`produce:${produceId}`)
        ]);

        return { message: 'Produce deleted successfully' };
    }

    // ============ RENTAL SPACE MANAGEMENT ============

    static async createRentalSpace(userId: number, data: CreateRentalSpaceInput): Promise<any> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        const space = await prisma.$queryRaw<any[]>`
            INSERT INTO "RentalSpace" ("vendorId", location, size, price, availability, "createdAt", "updatedAt")
            VALUES (${vendorId}, ${data.location}, ${data.size}, ${data.price}, true, NOW(), NOW())
            RETURNING id, "vendorId", location, size, price, availability, "createdAt", "updatedAt"
        `;

        // Clear caches
        await Promise.all([
            RedisCacheService.del(`vendor:profile:${userId}`),
            RedisCacheService.delPattern('rental:spaces:*')
        ]);

        return space[0];
    }

    static async getVendorRentalSpaces(userId: number): Promise<any[]> {
        const cacheKey = `vendor:rental:spaces:${userId}`;

        const cached = await RedisCacheService.getFast<any[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        const spaces = await prisma.$queryRaw<any[]>`
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

        await RedisCacheService.setFast(cacheKey, spaces, 300);

        return spaces;
    }

    static async updateRentalSpace(userId: number, spaceId: number, data: UpdateRentalSpaceInput): Promise<any> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        const updated = await prisma.$queryRaw<any[]>`
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

        // Clear caches
        await Promise.all([
            RedisCacheService.del(`vendor:profile:${userId}`),
            RedisCacheService.del(`vendor:rental:spaces:${userId}`),
            RedisCacheService.delPattern('rental:spaces:*'),
            RedisCacheService.del(`rental:space:${spaceId}`)
        ]);

        return updated[0];
    }

    static async deleteRentalSpace(userId: number, spaceId: number): Promise<MessageResponse> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        // Check if space has bookings
        const bookings = await prisma.$queryRaw<any[]>`
            SELECT id FROM "RentalBooking" WHERE "spaceId" = ${spaceId} LIMIT 1
        `;

        if (bookings && bookings.length > 0) {
            throw new Error('Cannot delete space with existing bookings');
        }

        await prisma.$executeRaw`
            DELETE FROM "RentalSpace" WHERE id = ${spaceId} AND "vendorId" = ${vendorId}
        `;

        // Clear caches
        await Promise.all([
            RedisCacheService.del(`vendor:profile:${userId}`),
            RedisCacheService.del(`vendor:rental:spaces:${userId}`),
            RedisCacheService.delPattern('rental:spaces:*'),
            RedisCacheService.del(`rental:space:${spaceId}`)
        ]);

        return { message: 'Rental space deleted successfully' };
    }

    // ============ CERTIFICATION MANAGEMENT ============

    static async submitCertification(userId: number, data: SubmitCertificationInput): Promise<MessageResponse> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        const existingCert = await prisma.$queryRaw<any[]>`
            SELECT id FROM "SustainabilityCert" WHERE "vendorId" = ${vendorId} LIMIT 1
        `;

        if (existingCert && existingCert.length > 0) {
            throw new Error('Certification already submitted');
        }

        await prisma.$executeRaw`
            INSERT INTO "SustainabilityCert" ("vendorId", "certifyingAgency", "certificationDate", "expiryDate", "documentUrl", "verificationStatus", "createdAt", "updatedAt")
            VALUES (${vendorId}, ${data.certifyingAgency}, ${data.certificationDate}, ${data.expiryDate}, ${data.documentUrl}, 'PENDING', NOW(), NOW())
        `;

        // Clear cache
        await RedisCacheService.del(`vendor:profile:${userId}`);

        return { message: 'Certification submitted successfully' };
    }

    static async getCertificationStatus(userId: number): Promise<any> {
        const cacheKey = `vendor:cert:${userId}`;

        const cached = await RedisCacheService.getFast<any>(cacheKey);
        if (cached) {
            return cached;
        }

        const vendor = await prisma.$queryRaw<any[]>`
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

        await RedisCacheService.setFast(cacheKey, result, 300);

        return result;
    }

    // ============ ORDER MANAGEMENT WITH QUERY BUILDER ============

    static async getVendorOrders(
        userId: number,
        queryParams: VendorOrderQueryParams = {}
    ): Promise<PaginatedResponse<VendorOrderResponse>> {
        const cacheKey = `vendor:orders:${userId}:${JSON.stringify(queryParams)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<VendorOrderResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        // Build query using query builder
        const queryBuilder = new PrismaQueryBuilder('Order', queryParams as any);

        // Add vendor filter
        const vendorCondition = Prisma.sql`"vendorId" = ${vendorId}`;
        queryBuilder.addCustomCondition(vendorCondition);

        // Add status filter
        if (queryParams.status) {
            const statusCondition = Prisma.sql`status = ${queryParams.status}`;
            queryBuilder.addCustomCondition(statusCondition);
        }

        // Custom query with joins
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
                p.name as produce_name
            FROM "Order" o
            LEFT JOIN "User" u ON o."userId" = u.id
            LEFT JOIN "Produce" p ON o."produceId" = p.id
        `;

        const result = await queryBuilder.execute<VendorOrderResponse>(customQuery);

        // Transform data
        const transformedData = result.data.map((order: any) => ({
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

        const response: PaginatedResponse<VendorOrderResponse> = {
            data: transformedData,
            meta: result.meta
        };

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    static async updateOrderStatus(userId: number, orderId: number, data: UpdateOrderStatusInput): Promise<MessageResponse> {
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        await prisma.$executeRaw`
            UPDATE "Order"
            SET status = ${data.status}, "updatedAt" = NOW()
            WHERE id = ${orderId} AND "vendorId" = ${vendorId}
        `;

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern(`vendor:orders:${userId}:*`),
            RedisCacheService.del(`order:${orderId}`)
        ]);

        return { message: 'Order status updated successfully' };
    }

    // ============ BOOKINGS MANAGEMENT ============

    static async getVendorBookings(userId: number): Promise<VendorBookingResponse[]> {
        const cacheKey = `vendor:bookings:${userId}`;

        const cached = await RedisCacheService.getFast<VendorBookingResponse[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        const bookings = await prisma.$queryRaw<any[]>`
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

        const transformedBookings: VendorBookingResponse[] = bookings.map((booking: any) => ({
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

        await RedisCacheService.setFast(cacheKey, transformedBookings, 300);

        return transformedBookings;
    }

    // ============ REVENUE REPORT ============

    static async getRevenueReport(userId: number): Promise<RevenueReportResponse> {
        const cacheKey = `vendor:revenue:${userId}`;

        const cached = await RedisCacheService.getFast<RevenueReportResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        const report = await prisma.$queryRaw<any[]>`
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

        const response: RevenueReportResponse = {
            totalRevenue: Number(result.totalrevenue) || 0,
            totalOrders: Number(result.totalorders) || 0,
            averageOrderValue: Number(result.averageordervalue) || 0,
            topProducts: result.topproducts || [],
        };

        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }
}