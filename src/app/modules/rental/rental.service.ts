// modules/rental/rental.service.ts
import { Prisma, OrderStatus } from '@prisma/client';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import socketService from '../../services/socket.service';
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

    // ============ SEARCH RENTAL SPACES ============
    static async searchRentalSpaces(filters: SearchRentalSpaceInput): Promise<PaginatedRentalSpacesResponse> {
        try {
            const cacheKey = `rental:spaces:${JSON.stringify(filters)}`;

            const cached = await RedisCacheService.getFast<PaginatedRentalSpacesResponse>(cacheKey);
            if (cached) {
                return cached;
            }

            const page = filters.page || 1;
            const limit = Math.min(50, filters.limit || 10);
            const skip = (page - 1) * limit;

            // Build where clause
            const where: Prisma.RentalSpaceWhereInput = {
                availability: filters.availability !== undefined ? filters.availability : true
            };

            // Location search with partial matching (case insensitive)
            if (filters.location && filters.location.trim()) {
                where.location = {
                    contains: filters.location.trim(),
                    mode: 'insensitive'
                };
                console.log(`📍 Searching for location: ${filters.location}`);
            }

            // Size range filter
            if (filters.minSize !== undefined || filters.maxSize !== undefined) {
                where.size = {};
                if (filters.minSize !== undefined) {
                    where.size.gte = filters.minSize;
                    console.log(`📏 Min size: ${filters.minSize}`);
                }
                if (filters.maxSize !== undefined) {
                    where.size.lte = filters.maxSize;
                    console.log(`📏 Max size: ${filters.maxSize}`);
                }
            }

            // Price range filter
            if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
                where.price = {};
                if (filters.minPrice !== undefined) {
                    where.price.gte = filters.minPrice;
                    console.log(`💰 Min price: ${filters.minPrice}`);
                }
                if (filters.maxPrice !== undefined) {
                    where.price.lte = filters.maxPrice;
                    console.log(`💰 Max price: ${filters.maxPrice}`);
                }
            }

            // Get sort order
            const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
            const sortBy = filters.sortBy || 'createdAt';

            console.log(`📊 Sorting by: ${sortBy} ${sortOrder}`);

            // Execute queries with Prisma
            const [spaces, total] = await Promise.all([
                prisma.rentalSpace.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                    include: {
                        vendor: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        email: true,
                                        phoneNumber: true,
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.rentalSpace.count({ where })
            ]);

            console.log(`✅ Found ${total} rental spaces matching criteria`);

            const transformedSpaces: RentalSpaceResponse[] = spaces.map(space => ({
                id: space.id,
                vendorId: space.vendorId,
                location: space.location,
                size: space.size,
                price: space.price,
                availability: space.availability,
                createdAt: space.createdAt,
                updatedAt: space.updatedAt,
                vendor: {
                    id: space.vendor.id,
                    farmName: space.vendor.farmName,
                    user: {
                        name: space.vendor.user.name,
                        email: space.vendor.user.email,
                        phoneNumber: space.vendor.user.phoneNumber || undefined,
                    },
                },
            }));

            const totalPages = Math.ceil(total / limit);

            const response: PaginatedRentalSpacesResponse = {
                spaces: transformedSpaces,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                }
            };

            await RedisCacheService.setFast(cacheKey, response, 300);
            return response;
        } catch (error: any) {
            console.error('Error in searchRentalSpaces:', error);
            throw new Error(error.message || 'Failed to search rental spaces');
        }
    }

    static async getRentalSpaceById(spaceId: number): Promise<RentalSpaceResponse> {
        try {
            const cacheKey = `rental:space:${spaceId}`;

            const cached = await RedisCacheService.getFast<RentalSpaceResponse>(cacheKey);
            if (cached) {
                return cached;
            }

            const space = await prisma.rentalSpace.findFirst({
                where: {
                    id: spaceId,
                    availability: true
                },
                include: {
                    vendor: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    phoneNumber: true,
                                }
                            }
                        }
                    }
                }
            });

            if (!space) {
                throw new Error('Rental space not found');
            }

            const response: RentalSpaceResponse = {
                id: space.id,
                vendorId: space.vendorId,
                location: space.location,
                size: space.size,
                price: space.price,
                availability: space.availability,
                createdAt: space.createdAt,
                updatedAt: space.updatedAt,
                vendor: {
                    id: space.vendor.id,
                    farmName: space.vendor.farmName,
                    user: {
                        name: space.vendor.user.name,
                        email: space.vendor.user.email,
                        phoneNumber: space.vendor.user.phoneNumber || undefined,
                    },
                },
            };

            await RedisCacheService.setFast(cacheKey, response, 300);
            return response;
        } catch (error: any) {
            console.error('Error in getRentalSpaceById:', error);
            throw new Error(error.message || 'Failed to fetch rental space');
        }
    }

    // ============ CREATE RENTAL BOOKING ============
    static async createBooking(userId: number, data: CreateRentalBookingInput): Promise<RentalBookingResponse> {
        try {
            // Validate dates
            if (data.startDate >= data.endDate) {
                throw new Error('End date must be after start date');
            }

            // Get rental space with vendor info
            const space = await prisma.rentalSpace.findFirst({
                where: {
                    id: data.spaceId,
                    availability: true
                },
                include: {
                    vendor: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    phoneNumber: true,
                                }
                            }
                        }
                    }
                }
            });

            if (!space) {
                throw new Error('Rental space not available');
            }

            // Check for overlapping bookings
            const overlappingBooking = await prisma.rentalBooking.findFirst({
                where: {
                    spaceId: data.spaceId,
                    status: { not: 'CANCELLED' },
                    OR: [
                        {
                            AND: [
                                { startDate: { lte: data.startDate } },
                                { endDate: { gte: data.startDate } }
                            ]
                        },
                        {
                            AND: [
                                { startDate: { lte: data.endDate } },
                                { endDate: { gte: data.endDate } }
                            ]
                        }
                    ]
                }
            });

            if (overlappingBooking) {
                throw new Error('Space already booked for selected dates');
            }

            // Create booking using Prisma
            const booking = await prisma.rentalBooking.create({
                data: {
                    spaceId: data.spaceId,
                    userId: userId,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    status: OrderStatus.PENDING,
                    orderDate: new Date(),
                },
                include: {
                    space: {
                        include: {
                            vendor: {
                                include: {
                                    user: {
                                        select: {
                                            name: true,
                                            email: true,
                                            phoneNumber: true,
                                        }
                                    }
                                }
                            }
                        }
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        }
                    }
                }
            });

            // Send real-time notification to vendor via Socket.IO
            await socketService.sendBookingNotification(space.vendor.user.id, {
                bookingId: booking.id,
                spaceId: data.spaceId,
                customerName: booking.user.name,
                startDate: data.startDate,
                endDate: data.endDate,
                timestamp: new Date()
            });

            // Create database notification for vendor
            await prisma.notification.create({
                data: {
                    userId: space.vendor.user.id,
                    title: 'New Rental Booking',
                    message: `New booking request for your space at ${space.location}`,
                    type: 'RENTAL',
                    metadata: {
                        bookingId: booking.id,
                        spaceId: data.spaceId,
                        startDate: data.startDate,
                        endDate: data.endDate
                    }
                },
            });

            // Clear caches
            await Promise.all([
                RedisCacheService.delPattern('rental:spaces:*'),
                RedisCacheService.delPattern(`rental:bookings:user:${userId}:*`),
                RedisCacheService.delPattern(`rental:vendor:bookings:${space.vendor.user.id}:*`)
            ]);

            const response: RentalBookingResponse = {
                id: booking.id,
                spaceId: booking.spaceId,
                userId: booking.userId,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: booking.status,
                orderDate: booking.orderDate,
                space: {
                    location: booking.space.location,
                    size: booking.space.size,
                    price: booking.space.price,
                    vendor: {
                        farmName: booking.space.vendor.farmName,
                        user: {
                            name: booking.space.vendor.user.name,
                            email: booking.space.vendor.user.email,
                            phoneNumber: booking.space.vendor.user.phoneNumber || undefined,
                        },
                    },
                },
            };

            return response;
        } catch (error: any) {
            console.error('Error in createBooking:', error);
            throw new Error(error.message || 'Failed to create booking');
        }
    }

    // ============ GET USER BOOKINGS ============
    static async getUserBookings(userId: number, filters: GetUserBookingsInput = {}): Promise<PaginatedBookingsResponse> {
        try {
            const cacheKey = `rental:bookings:user:${userId}:${JSON.stringify(filters)}`;

            const cached = await RedisCacheService.getFast<PaginatedBookingsResponse>(cacheKey);
            if (cached) {
                return cached;
            }

            const page = filters.page || 1;
            const limit = Math.min(50, filters.limit || 10);
            const skip = (page - 1) * limit;

            // Build where clause
            const where: Prisma.RentalBookingWhereInput = {
                userId: userId
            };

            if (filters.status) {
                where.status = filters.status;
            }

            // Get sort order
            const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
            const sortBy = filters.sortBy || 'orderDate';

            // Execute queries with Prisma
            const [bookings, total] = await Promise.all([
                prisma.rentalBooking.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                    include: {
                        space: {
                            include: {
                                vendor: {
                                    include: {
                                        user: {
                                            select: {
                                                name: true,
                                                email: true,
                                                phoneNumber: true,
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.rentalBooking.count({ where })
            ]);

            const transformedBookings: RentalBookingResponse[] = bookings.map(booking => ({
                id: booking.id,
                spaceId: booking.spaceId,
                userId: booking.userId,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: booking.status,
                orderDate: booking.orderDate,
                space: {
                    location: booking.space.location,
                    size: booking.space.size,
                    price: booking.space.price,
                    vendor: {
                        farmName: booking.space.vendor.farmName,
                        user: {
                            name: booking.space.vendor.user.name,
                            email: booking.space.vendor.user.email,
                            phoneNumber: booking.space.vendor.user.phoneNumber || undefined,
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

            await RedisCacheService.setFast(cacheKey, response, 120);
            return response;
        } catch (error: any) {
            console.error('Error in getUserBookings:', error);
            throw new Error(error.message || 'Failed to fetch bookings');
        }
    }

    static async getBookingById(userId: number, bookingId: number): Promise<RentalBookingResponse> {
        try {
            const cacheKey = `rental:booking:${bookingId}:user:${userId}`;

            const cached = await RedisCacheService.getFast<RentalBookingResponse>(cacheKey);
            if (cached) {
                return cached;
            }

            const booking = await prisma.rentalBooking.findFirst({
                where: {
                    id: bookingId,
                    userId: userId
                },
                include: {
                    space: {
                        include: {
                            vendor: {
                                include: {
                                    user: {
                                        select: {
                                            name: true,
                                            email: true,
                                            phoneNumber: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!booking) {
                throw new Error('Booking not found');
            }

            const response: RentalBookingResponse = {
                id: booking.id,
                spaceId: booking.spaceId,
                userId: booking.userId,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: booking.status,
                orderDate: booking.orderDate,
                space: {
                    location: booking.space.location,
                    size: booking.space.size,
                    price: booking.space.price,
                    vendor: {
                        farmName: booking.space.vendor.farmName,
                        user: {
                            name: booking.space.vendor.user.name,
                            email: booking.space.vendor.user.email,
                            phoneNumber: booking.space.vendor.user.phoneNumber || undefined,
                        },
                    },
                },
            };

            await RedisCacheService.setFast(cacheKey, response, 300);
            return response;
        } catch (error: any) {
            console.error('Error in getBookingById:', error);
            throw new Error(error.message || 'Failed to fetch booking');
        }
    }

    // ============ CANCEL BOOKING ============
    static async cancelBooking(userId: number, bookingId: number, reason?: string): Promise<{ message: string }> {
        try {
            const booking = await prisma.rentalBooking.findFirst({
                where: {
                    id: bookingId,
                    userId: userId
                },
                include: {
                    space: {
                        include: {
                            vendor: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!booking) {
                throw new Error('Booking not found');
            }

            if (booking.status === OrderStatus.COMPLETED) {
                throw new Error('Cannot cancel completed booking');
            }

            if (booking.status === OrderStatus.CANCELLED) {
                throw new Error('Booking already cancelled');
            }

            // Update booking status
            await prisma.rentalBooking.update({
                where: { id: bookingId },
                data: { status: OrderStatus.CANCELLED }
            });

            // Send real-time notification to vendor via Socket.IO
            await socketService.sendBookingStatusUpdate(booking.space.vendor.user.id, bookingId, OrderStatus.CANCELLED);

            // Create database notification for vendor
            await prisma.notification.create({
                data: {
                    userId: booking.space.vendor.user.id,
                    title: 'Booking Cancelled',
                    message: `Booking for space at ${booking.space.location} has been cancelled${reason ? ` Reason: ${reason}` : ''}`,
                    type: 'RENTAL',
                    metadata: {
                        bookingId: bookingId,
                        spaceId: booking.spaceId,
                        reason: reason
                    }
                },
            });

            // Clear caches
            await Promise.all([
                RedisCacheService.delPattern('rental:spaces:*'),
                RedisCacheService.delPattern(`rental:bookings:user:${userId}:*`),
                RedisCacheService.delPattern(`rental:vendor:bookings:${booking.space.vendor.user.id}:*`),
                RedisCacheService.del(`rental:booking:${bookingId}:user:${userId}`),
            ]);

            return { message: 'Booking cancelled successfully' };
        } catch (error: any) {
            console.error('Error in cancelBooking:', error);
            throw new Error(error.message || 'Failed to cancel booking');
        }
    }

    // ============ VENDOR BOOKINGS ============
    static async getVendorBookings(vendorUserId: number, filters: GetUserBookingsInput = {}): Promise<PaginatedBookingsResponse> {
        try {
            const cacheKey = `rental:vendor:bookings:${vendorUserId}:${JSON.stringify(filters)}`;

            const cached = await RedisCacheService.getFast<PaginatedBookingsResponse>(cacheKey);
            if (cached) {
                return cached;
            }

            // Get vendor profile
            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId: vendorUserId },
                select: { id: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const page = filters.page || 1;
            const limit = Math.min(50, filters.limit || 10);
            const skip = (page - 1) * limit;

            // Build where clause for bookings
            const where: Prisma.RentalBookingWhereInput = {
                space: {
                    vendorId: vendor.id
                }
            };

            if (filters.status) {
                where.status = filters.status;
            }

            // Get sort order
            const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
            const sortBy = filters.sortBy || 'orderDate';

            // Execute queries with Prisma
            const [bookings, total] = await Promise.all([
                prisma.rentalBooking.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                    include: {
                        space: {
                            select: {
                                location: true,
                                size: true,
                                price: true,
                            }
                        },
                        user: {
                            select: {
                                name: true,
                                email: true,
                                phoneNumber: true,
                            }
                        }
                    }
                }),
                prisma.rentalBooking.count({ where })
            ]);

            const transformedBookings: RentalBookingResponse[] = bookings.map(booking => ({
                id: booking.id,
                spaceId: booking.spaceId,
                userId: booking.userId,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: booking.status,
                orderDate: booking.orderDate,
                space: {
                    location: booking.space.location,
                    size: booking.space.size,
                    price: booking.space.price,
                    vendor: {
                        farmName: '',
                        user: {
                            name: booking.user.name,
                            email: booking.user.email,
                            phoneNumber: booking.user.phoneNumber || undefined,
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

            await RedisCacheService.setFast(cacheKey, response, 120);
            return response;
        } catch (error: any) {
            console.error('Error in getVendorBookings:', error);
            throw new Error(error.message || 'Failed to fetch vendor bookings');
        }
    }

    // ============ UPDATE BOOKING STATUS (VENDOR) ============
    static async updateBookingStatus(
        vendorUserId: number,
        bookingId: number,
        status: OrderStatus
    ): Promise<{ message: string }> {
        try {
            // Verify vendor owns this booking's space
            const booking = await prisma.rentalBooking.findFirst({
                where: {
                    id: bookingId,
                    space: {
                        vendor: {
                            userId: vendorUserId
                        }
                    }
                },
                include: {
                    space: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            });

            if (!booking) {
                throw new Error('Booking not found or unauthorized');
            }

            if (booking.status === OrderStatus.CANCELLED) {
                throw new Error('Cannot update cancelled booking');
            }

            if (booking.status === OrderStatus.COMPLETED && status !== OrderStatus.COMPLETED) {
                throw new Error('Cannot modify completed booking');
            }

            // Update booking status
            await prisma.rentalBooking.update({
                where: { id: bookingId },
                data: { status: status }
            });

            // Send notification to customer
            await socketService.sendBookingStatusUpdate(booking.user.id, bookingId, status);

            // Create notification for customer
            await prisma.notification.create({
                data: {
                    userId: booking.user.id,
                    title: 'Booking Status Updated',
                    message: `Your booking for space at ${booking.space.location} has been ${status.toLowerCase()}`,
                    type: 'RENTAL',
                    metadata: {
                        bookingId: bookingId,
                        status: status
                    }
                },
            });

            // Clear caches
            await Promise.all([
                RedisCacheService.delPattern(`rental:bookings:user:${booking.user.id}:*`),
                RedisCacheService.delPattern(`rental:vendor:bookings:${vendorUserId}:*`),
                RedisCacheService.del(`rental:booking:${bookingId}:user:${booking.user.id}`),
            ]);

            return { message: `Booking ${status.toLowerCase()} successfully` };
        } catch (error: any) {
            console.error('Error in updateBookingStatus:', error);
            throw new Error(error.message || 'Failed to update booking status');
        }
    }
}