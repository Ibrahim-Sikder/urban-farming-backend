"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentalService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const socket_service_1 = __importDefault(require("../../services/socket.service"));
class RentalService {
    static async searchRentalSpaces(filters) {
        try {
            const cacheKey = `rental:spaces:${JSON.stringify(filters)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const page = filters.page || 1;
            const limit = Math.min(50, filters.limit || 10);
            const skip = (page - 1) * limit;
            const where = {
                availability: filters.availability !== undefined ? filters.availability : true
            };
            if (filters.location && filters.location.trim()) {
                where.location = {
                    contains: filters.location.trim(),
                    mode: 'insensitive'
                };
            }
            if (filters.minSize !== undefined || filters.maxSize !== undefined) {
                where.size = {};
                if (filters.minSize !== undefined) {
                    where.size.gte = filters.minSize;
                }
                if (filters.maxSize !== undefined) {
                    where.size.lte = filters.maxSize;
                }
            }
            if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
                where.price = {};
                if (filters.minPrice !== undefined) {
                    where.price.gte = filters.minPrice;
                }
                if (filters.maxPrice !== undefined) {
                    where.price.lte = filters.maxPrice;
                }
            }
            const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
            const sortBy = filters.sortBy || 'createdAt';
            const [spaces, total] = await Promise.all([
                prisma_1.default.rentalSpace.findMany({
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
                prisma_1.default.rentalSpace.count({ where })
            ]);
            const transformedSpaces = spaces.map(space => ({
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
            const response = {
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
            await redis_cache_service_1.default.setFast(cacheKey, response, 300);
            return response;
        }
        catch (error) {
            throw new Error(error.message || 'Failed to search rental spaces');
        }
    }
    static async getRentalSpaceById(spaceId) {
        try {
            const cacheKey = `rental:space:${spaceId}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const space = await prisma_1.default.rentalSpace.findFirst({
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
            const response = {
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
            await redis_cache_service_1.default.setFast(cacheKey, response, 300);
            return response;
        }
        catch (error) {
            throw new Error(error.message || 'Failed to fetch rental space');
        }
    }
    static async createBooking(userId, data) {
        try {
            if (data.startDate >= data.endDate) {
                throw new Error('End date must be after start date');
            }
            const space = await prisma_1.default.rentalSpace.findFirst({
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
            const overlappingBooking = await prisma_1.default.rentalBooking.findFirst({
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
            const booking = await prisma_1.default.rentalBooking.create({
                data: {
                    spaceId: data.spaceId,
                    userId: userId,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    status: client_1.OrderStatus.PENDING,
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
            await socket_service_1.default.sendBookingNotification(space.vendor.user.id, {
                bookingId: booking.id,
                spaceId: data.spaceId,
                customerName: booking.user.name,
                startDate: data.startDate,
                endDate: data.endDate,
                timestamp: new Date()
            });
            await prisma_1.default.notification.create({
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
            await Promise.all([
                redis_cache_service_1.default.delPattern('rental:spaces:*'),
                redis_cache_service_1.default.delPattern(`rental:bookings:user:${userId}:*`),
                redis_cache_service_1.default.delPattern(`rental:vendor:bookings:${space.vendor.user.id}:*`)
            ]);
            const response = {
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
        }
        catch (error) {
            throw new Error(error.message || 'Failed to create booking');
        }
    }
    static async getUserBookings(userId, filters = {}) {
        try {
            const cacheKey = `rental:bookings:user:${userId}:${JSON.stringify(filters)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const page = filters.page || 1;
            const limit = Math.min(50, filters.limit || 10);
            const skip = (page - 1) * limit;
            const where = {
                userId: userId
            };
            if (filters.status) {
                where.status = filters.status;
            }
            const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
            const sortBy = filters.sortBy || 'orderDate';
            const [bookings, total] = await Promise.all([
                prisma_1.default.rentalBooking.findMany({
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
                prisma_1.default.rentalBooking.count({ where })
            ]);
            const transformedBookings = bookings.map(booking => ({
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
            const response = {
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
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            throw new Error(error.message || 'Failed to fetch bookings');
        }
    }
    static async getBookingById(userId, bookingId) {
        try {
            const cacheKey = `rental:booking:${bookingId}:user:${userId}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const booking = await prisma_1.default.rentalBooking.findFirst({
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
            const response = {
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
            await redis_cache_service_1.default.setFast(cacheKey, response, 300);
            return response;
        }
        catch (error) {
            throw new Error(error.message || 'Failed to fetch booking');
        }
    }
    static async cancelBooking(userId, bookingId, reason) {
        try {
            const booking = await prisma_1.default.rentalBooking.findFirst({
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
            if (booking.status === client_1.OrderStatus.COMPLETED) {
                throw new Error('Cannot cancel completed booking');
            }
            if (booking.status === client_1.OrderStatus.CANCELLED) {
                throw new Error('Booking already cancelled');
            }
            await prisma_1.default.rentalBooking.update({
                where: { id: bookingId },
                data: { status: client_1.OrderStatus.CANCELLED }
            });
            await socket_service_1.default.sendBookingStatusUpdate(booking.space.vendor.user.id, bookingId, client_1.OrderStatus.CANCELLED);
            await prisma_1.default.notification.create({
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
            await Promise.all([
                redis_cache_service_1.default.delPattern('rental:spaces:*'),
                redis_cache_service_1.default.delPattern(`rental:bookings:user:${userId}:*`),
                redis_cache_service_1.default.delPattern(`rental:vendor:bookings:${booking.space.vendor.user.id}:*`),
                redis_cache_service_1.default.del(`rental:booking:${bookingId}:user:${userId}`),
            ]);
            return { message: 'Booking cancelled successfully' };
        }
        catch (error) {
            throw new Error(error.message || 'Failed to cancel booking');
        }
    }
    static async getVendorBookings(vendorUserId, filters = {}) {
        try {
            const cacheKey = `rental:vendor:bookings:${vendorUserId}:${JSON.stringify(filters)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId: vendorUserId },
                select: { id: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            const page = filters.page || 1;
            const limit = Math.min(50, filters.limit || 10);
            const skip = (page - 1) * limit;
            const where = {
                space: {
                    vendorId: vendor.id
                }
            };
            if (filters.status) {
                where.status = filters.status;
            }
            const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
            const sortBy = filters.sortBy || 'orderDate';
            const [bookings, total] = await Promise.all([
                prisma_1.default.rentalBooking.findMany({
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
                prisma_1.default.rentalBooking.count({ where })
            ]);
            const transformedBookings = bookings.map(booking => ({
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
            const response = {
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
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            throw new Error(error.message || 'Failed to fetch vendor bookings');
        }
    }
    static async updateBookingStatus(vendorUserId, bookingId, status) {
        try {
            const booking = await prisma_1.default.rentalBooking.findFirst({
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
            if (booking.status === client_1.OrderStatus.CANCELLED) {
                throw new Error('Cannot update cancelled booking');
            }
            if (booking.status === client_1.OrderStatus.COMPLETED && status !== client_1.OrderStatus.COMPLETED) {
                throw new Error('Cannot modify completed booking');
            }
            await prisma_1.default.rentalBooking.update({
                where: { id: bookingId },
                data: { status: status }
            });
            await socket_service_1.default.sendBookingStatusUpdate(booking.user.id, bookingId, status);
            await prisma_1.default.notification.create({
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
            await Promise.all([
                redis_cache_service_1.default.delPattern(`rental:bookings:user:${booking.user.id}:*`),
                redis_cache_service_1.default.delPattern(`rental:vendor:bookings:${vendorUserId}:*`),
                redis_cache_service_1.default.del(`rental:booking:${bookingId}:user:${booking.user.id}`),
            ]);
            return { message: `Booking ${status.toLowerCase()} successfully` };
        }
        catch (error) {
            throw new Error(error.message || 'Failed to update booking status');
        }
    }
}
exports.RentalService = RentalService;
//# sourceMappingURL=rental.service.js.map