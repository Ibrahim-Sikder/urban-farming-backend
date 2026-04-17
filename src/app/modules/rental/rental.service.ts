import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import { PrismaQueryBuilder } from '../../shared/utils/prisma-query-builder';
import {
    CreateRentalBookingInput,
    UpdateRentalBookingInput,
    SearchRentalSpaceInput,
    GetUserBookingsInput,
    RentalSpaceResponse,
    RentalBookingResponse,
    PaginatedRentalSpacesResponse,
    PaginatedBookingsResponse
} from './rental.type';

export class RentalService {

    // ============ SEARCH RENTAL SPACES WITH QUERY BUILDER ============
    static async searchRentalSpaces(filters: SearchRentalSpaceInput): Promise<PaginatedRentalSpacesResponse> {
        // Create cache key
        const cacheKey = `rental:spaces:${JSON.stringify(filters)}`;

        // Try cache first
        const cached = await RedisCacheService.getFast<PaginatedRentalSpacesResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        // Build query using the reusable query builder
        const queryBuilder = new PrismaQueryBuilder('RentalSpace', filters as any);

        // Set searchable fields
        queryBuilder.setSearchFields(['location']);

        // Build where conditions for range filters
        const conditions: Prisma.Sql[] = [];

        if (filters.minSize !== undefined) {
            conditions.push(Prisma.sql`size >= ${filters.minSize}`);
        }
        if (filters.maxSize !== undefined) {
            conditions.push(Prisma.sql`size <= ${filters.maxSize}`);
        }
        if (filters.minPrice !== undefined) {
            conditions.push(Prisma.sql`price >= ${filters.minPrice}`);
        }
        if (filters.maxPrice !== undefined) {
            conditions.push(Prisma.sql`price <= ${filters.maxPrice}`);
        }
        if (filters.availability !== undefined) {
            conditions.push(Prisma.sql`availability = ${filters.availability}`);
        } else {
            conditions.push(Prisma.sql`availability = true`);
        }

        // Combine all conditions
        if (conditions.length > 0) {
            const combinedCondition = Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
            queryBuilder.addCustomCondition(combinedCondition);
        }

        // Custom query with vendor and user info
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
                vp.id as vendor_id,
                vp."farmName",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u."phoneNumber" as user_phone
            FROM "RentalSpace" rs
            LEFT JOIN "VendorProfile" vp ON rs."vendorId" = vp.id
            LEFT JOIN "User" u ON vp."userId" = u.id
        `;

        // Execute query with pagination
        const result = await queryBuilder.execute<any>(customQuery);

        // Transform to expected response format
        const transformedSpaces: RentalSpaceResponse[] = result.data.map((space: any) => ({
            id: space.id,
            vendorId: space.vendorId,
            location: space.location,
            size: Number(space.size),
            price: Number(space.price),
            availability: space.availability,
            createdAt: space.createdAt,
            updatedAt: space.updatedAt,
            vendor: {
                id: space.vendor_id,
                farmName: space.farmName,
                user: {
                    name: space.user_name,
                    email: space.user_email,
                    phoneNumber: space.user_phone || undefined,
                },
            },
        }));

        const response: PaginatedRentalSpacesResponse = {
            spaces: transformedSpaces,
            meta: result.meta
        };

        // Cache for 5 minutes
        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }

    // ============ GET RENTAL SPACE BY ID ============
    static async getRentalSpaceById(spaceId: number): Promise<RentalSpaceResponse> {
        const cacheKey = `rental:space:${spaceId}`;

        // Try cache
        const cached = await RedisCacheService.getFast<RentalSpaceResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const space = await prisma.$queryRaw<any[]>`
            SELECT 
                rs.id,
                rs."vendorId",
                rs.location,
                rs.size,
                rs.price,
                rs.availability,
                rs."createdAt",
                rs."updatedAt",
                vp.id as vendor_id,
                vp."farmName",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u."phoneNumber" as user_phone
            FROM "RentalSpace" rs
            LEFT JOIN "VendorProfile" vp ON rs."vendorId" = vp.id
            LEFT JOIN "User" u ON vp."userId" = u.id
            WHERE rs.id = ${spaceId} AND rs.availability = true
            LIMIT 1
        `;

        if (!space || space.length === 0) {
            throw new Error('Rental space not found');
        }

        const result = space[0];
        const response: RentalSpaceResponse = {
            id: result.id,
            vendorId: result.vendorId,
            location: result.location,
            size: Number(result.size),
            price: Number(result.price),
            availability: result.availability,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            vendor: {
                id: result.vendor_id,
                farmName: result.farmName,
                user: {
                    name: result.user_name,
                    email: result.user_email,
                    phoneNumber: result.user_phone || undefined,
                },
            },
        };

        // Cache for 5 minutes
        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }

    // ============ CREATE RENTAL BOOKING ============
    static async createBooking(userId: number, data: CreateRentalBookingInput): Promise<RentalBookingResponse> {
        // Check if space exists and is available
        const space = await prisma.$queryRaw<any[]>`
            SELECT 
                rs.id,
                rs.location,
                rs.size,
                rs.price,
                vp.id as vendor_id,
                vp."farmName",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u."phoneNumber" as user_phone
            FROM "RentalSpace" rs
            LEFT JOIN "VendorProfile" vp ON rs."vendorId" = vp.id
            LEFT JOIN "User" u ON vp."userId" = u.id
            WHERE rs.id = ${data.spaceId} AND rs.availability = true
            LIMIT 1
        `;

        if (!space || space.length === 0) {
            throw new Error('Rental space not available');
        }

        const spaceData = space[0];

        // Check for overlapping bookings
        const existingBooking = await prisma.$queryRaw<any[]>`
            SELECT id FROM "RentalBooking"
            WHERE "spaceId" = ${data.spaceId}
            AND status != 'CANCELLED'
            AND (
                ("startDate" <= ${data.startDate} AND "endDate" >= ${data.startDate})
                OR ("startDate" <= ${data.endDate} AND "endDate" >= ${data.endDate})
            )
            LIMIT 1
        `;

        if (existingBooking && existingBooking.length > 0) {
            throw new Error('Space already booked for selected dates');
        }

        // Create booking
        const booking = await prisma.$queryRaw<any[]>`
            INSERT INTO "RentalBooking" ("spaceId", "userId", "startDate", "endDate", status, "orderDate")
            VALUES (${data.spaceId}, ${userId}, ${data.startDate}, ${data.endDate}, 'PENDING', NOW())
            RETURNING id, "spaceId", "userId", "startDate", "endDate", status, "orderDate"
        `;

        const bookingData = booking[0];

        // Create notification for vendor
        await prisma.notification.create({
            data: {
                userId: spaceData.user_id,
                title: 'New Rental Booking',
                message: `New booking request for your space at ${spaceData.location}`,
                type: 'RENTAL',
            },
        });

        // Clear relevant caches
        await RedisCacheService.delPattern('rental:spaces:*');
        await RedisCacheService.delPattern(`rental:bookings:user:${userId}:*`);

        const response: RentalBookingResponse = {
            id: bookingData.id,
            spaceId: bookingData.spaceId,
            userId: bookingData.userId,
            startDate: bookingData.startDate,
            endDate: bookingData.endDate,
            status: bookingData.status,
            orderDate: bookingData.orderDate,
            space: {
                location: spaceData.location,
                size: Number(spaceData.size),
                price: Number(spaceData.price),
                vendor: {
                    farmName: spaceData.farmName,
                    user: {
                        name: spaceData.user_name,
                        email: spaceData.user_email,
                        phoneNumber: spaceData.user_phone || undefined,
                    },
                },
            },
        };

        return response;
    }

    // ============ GET USER BOOKINGS WITH PAGINATION ============
    static async getUserBookings(userId: number, filters: GetUserBookingsInput = {}): Promise<PaginatedBookingsResponse> {
        const cacheKey = `rental:bookings:user:${userId}:${JSON.stringify(filters)}`;

        // Try cache
        const cached = await RedisCacheService.getFast<PaginatedBookingsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const page = filters.page || 1;
        const limit = Math.min(50, filters.limit || 10);
        const offset = (page - 1) * limit;
        const sortBy = filters.sortBy || 'orderDate';
        const sortOrder = filters.sortOrder || 'desc';

        // Build where clause
        let whereClause = `"userId" = ${userId}`;
        if (filters.status) {
            whereClause += ` AND status = '${filters.status}'`;
        }

        // Get total count
        const countResult = await prisma.$queryRaw<{ total: number }[]>`
            SELECT COUNT(*) as total
            FROM "RentalBooking"
            WHERE ${Prisma.raw(whereClause)}
        `;
        const total = Number(countResult[0]?.total) || 0;

        // Get paginated bookings
        const bookings = await prisma.$queryRaw<any[]>`
            SELECT 
                rb.id,
                rb."spaceId",
                rb."userId",
                rb."startDate",
                rb."endDate",
                rb.status,
                rb."orderDate",
                rs.location as space_location,
                rs.size as space_size,
                rs.price as space_price,
                vp."farmName" as vendor_farmName,
                u.name as vendor_name,
                u.email as vendor_email,
                u."phoneNumber" as vendor_phone
            FROM "RentalBooking" rb
            LEFT JOIN "RentalSpace" rs ON rb."spaceId" = rs.id
            LEFT JOIN "VendorProfile" vp ON rs."vendorId" = vp.id
            LEFT JOIN "User" u ON vp."userId" = u.id
            WHERE ${Prisma.raw(whereClause)}
            ORDER BY "${sortBy}" ${Prisma.raw(sortOrder === 'asc' ? 'ASC' : 'DESC')}
            LIMIT ${limit} OFFSET ${offset}
        `;

        const transformedBookings: RentalBookingResponse[] = bookings.map((booking: any) => ({
            id: booking.id,
            spaceId: booking.spaceId,
            userId: booking.userId,
            startDate: booking.startDate,
            endDate: booking.endDate,
            status: booking.status,
            orderDate: booking.orderDate,
            space: {
                location: booking.space_location,
                size: Number(booking.space_size),
                price: Number(booking.space_price),
                vendor: {
                    farmName: booking.vendor_farmName,
                    user: {
                        name: booking.vendor_name,
                        email: booking.vendor_email,
                        phoneNumber: booking.vendor_phone || undefined,
                    },
                },
            },
        }));

        const totalPages = Math.ceil(total / limit);

        const response: PaginatedBookingsResponse = {
            bookings: transformedBookings,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };

        // Cache for 2 minutes
        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    // ============ GET BOOKING BY ID ============
    static async getBookingById(userId: number, bookingId: number): Promise<RentalBookingResponse> {
        const cacheKey = `rental:booking:${bookingId}:user:${userId}`;

        // Try cache
        const cached = await RedisCacheService.getFast<RentalBookingResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const booking = await prisma.$queryRaw<any[]>`
            SELECT 
                rb.id,
                rb."spaceId",
                rb."userId",
                rb."startDate",
                rb."endDate",
                rb.status,
                rb."orderDate",
                rs.location as space_location,
                rs.size as space_size,
                rs.price as space_price,
                vp."farmName" as vendor_farmName,
                u.name as vendor_name,
                u.email as vendor_email,
                u."phoneNumber" as vendor_phone
            FROM "RentalBooking" rb
            LEFT JOIN "RentalSpace" rs ON rb."spaceId" = rs.id
            LEFT JOIN "VendorProfile" vp ON rs."vendorId" = vp.id
            LEFT JOIN "User" u ON vp."userId" = u.id
            WHERE rb.id = ${bookingId} AND rb."userId" = ${userId}
            LIMIT 1
        `;

        if (!booking || booking.length === 0) {
            throw new Error('Booking not found');
        }

        const result = booking[0];
        const response: RentalBookingResponse = {
            id: result.id,
            spaceId: result.spaceId,
            userId: result.userId,
            startDate: result.startDate,
            endDate: result.endDate,
            status: result.status,
            orderDate: result.orderDate,
            space: {
                location: result.space_location,
                size: Number(result.space_size),
                price: Number(result.space_price),
                vendor: {
                    farmName: result.vendor_farmName,
                    user: {
                        name: result.vendor_name,
                        email: result.vendor_email,
                        phoneNumber: result.vendor_phone || undefined,
                    },
                },
            },
        };

        // Cache for 5 minutes
        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }

    // ============ CANCEL BOOKING ============
    static async cancelBooking(userId: number, bookingId: number, reason?: string): Promise<{ message: string }> {
        // Check if booking exists and belongs to user
        const booking = await prisma.$queryRaw<any[]>`
            SELECT 
                rb.id,
                rb.status,
                rb."spaceId",
                rs.location,
                vp."userId" as vendorUserId
            FROM "RentalBooking" rb
            LEFT JOIN "RentalSpace" rs ON rb."spaceId" = rs.id
            LEFT JOIN "VendorProfile" vp ON rs."vendorId" = vp.id
            WHERE rb.id = ${bookingId} AND rb."userId" = ${userId}
            LIMIT 1
        `;

        if (!booking || booking.length === 0) {
            throw new Error('Booking not found');
        }

        const bookingData = booking[0];

        if (bookingData.status === 'COMPLETED') {
            throw new Error('Cannot cancel completed booking');
        }

        // Update booking status
        await prisma.$executeRaw`
            UPDATE "RentalBooking"
            SET status = 'CANCELLED'
            WHERE id = ${bookingId}
        `;

        // Create notification for vendor
        await prisma.notification.create({
            data: {
                userId: bookingData.vendoruserid,
                title: 'Booking Cancelled',
                message: `Booking for space at ${bookingData.location} has been cancelled${reason ? ` Reason: ${reason}` : ''}`,
                type: 'RENTAL',
            },
        });

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern('rental:spaces:*'),
            RedisCacheService.delPattern(`rental:bookings:user:${userId}:*`),
            RedisCacheService.del(`rental:booking:${bookingId}:user:${userId}`),
        ]);

        return { message: 'Booking cancelled successfully' };
    }

    // ============ GET VENDOR BOOKINGS (For Vendor Module) ============
    static async getVendorBookings(vendorUserId: number, filters: GetUserBookingsInput = {}): Promise<PaginatedBookingsResponse> {
        const cacheKey = `rental:vendor:bookings:${vendorUserId}:${JSON.stringify(filters)}`;

        // Try cache
        const cached = await RedisCacheService.getFast<PaginatedBookingsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const page = filters.page || 1;
        const limit = Math.min(50, filters.limit || 10);
        const offset = (page - 1) * limit;
        const sortBy = filters.sortBy || 'orderDate';
        const sortOrder = filters.sortOrder || 'desc';

        // Get vendor profile
        const vendor = await prisma.$queryRaw<any[]>`
            SELECT id FROM "VendorProfile" WHERE "userId" = ${vendorUserId} LIMIT 1
        `;

        if (!vendor || vendor.length === 0) {
            throw new Error('Vendor profile not found');
        }

        const vendorId = vendor[0].id;

        // Build where clause
        let whereClause = `rs."vendorId" = ${vendorId}`;
        if (filters.status) {
            whereClause += ` AND rb.status = '${filters.status}'`;
        }

        // Get total count
        const countResult = await prisma.$queryRaw<{ total: number }[]>`
            SELECT COUNT(*) as total
            FROM "RentalBooking" rb
            LEFT JOIN "RentalSpace" rs ON rb."spaceId" = rs.id
            WHERE ${Prisma.raw(whereClause)}
        `;
        const total = Number(countResult[0]?.total) || 0;

        // Get paginated bookings
        const bookings = await prisma.$queryRaw<any[]>`
            SELECT 
                rb.id,
                rb."spaceId",
                rb."userId",
                rb."startDate",
                rb."endDate",
                rb.status,
                rb."orderDate",
                rs.location as space_location,
                rs.size as space_size,
                rs.price as space_price,
                u.name as customer_name,
                u.email as customer_email,
                u."phoneNumber" as customer_phone
            FROM "RentalBooking" rb
            LEFT JOIN "RentalSpace" rs ON rb."spaceId" = rs.id
            LEFT JOIN "User" u ON rb."userId" = u.id
            WHERE ${Prisma.raw(whereClause)}
            ORDER BY "${sortBy}" ${Prisma.raw(sortOrder === 'asc' ? 'ASC' : 'DESC')}
            LIMIT ${limit} OFFSET ${offset}
        `;

        const transformedBookings: RentalBookingResponse[] = bookings.map((booking: any) => ({
            id: booking.id,
            spaceId: booking.spaceId,
            userId: booking.userId,
            startDate: booking.startDate,
            endDate: booking.endDate,
            status: booking.status,
            orderDate: booking.orderDate,
            space: {
                location: booking.space_location,
                size: Number(booking.space_size),
                price: Number(booking.space_price),
                vendor: {
                    farmName: '', // Not needed for vendor view
                    user: {
                        name: booking.customer_name,
                        email: booking.customer_email,
                        phoneNumber: booking.customer_phone || undefined,
                    },
                },
            },
        }));

        const totalPages = Math.ceil(total / limit);

        const response: PaginatedBookingsResponse = {
            bookings: transformedBookings,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };

        // Cache for 2 minutes
        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }
}