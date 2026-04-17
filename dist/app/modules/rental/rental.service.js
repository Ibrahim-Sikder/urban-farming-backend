"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentalService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
class RentalService {
    static async searchRentalSpaces(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.location) {
            where.location = { contains: filters.location, mode: 'insensitive' };
        }
        if (filters.minSize !== undefined) {
            where.size = { ...where.size, gte: filters.minSize };
        }
        if (filters.maxSize !== undefined) {
            where.size = { ...where.size, lte: filters.maxSize };
        }
        if (filters.minPrice !== undefined) {
            where.price = { ...where.price, gte: filters.minPrice };
        }
        if (filters.maxPrice !== undefined) {
            where.price = { ...where.price, lte: filters.maxPrice };
        }
        if (filters.availability !== undefined) {
            where.availability = filters.availability;
        }
        else {
            where.availability = true;
        }
        const [spaces, total] = await Promise.all([
            prisma_1.default.rentalSpace.findMany({
                where,
                skip,
                take: limit,
                include: {
                    vendor: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.default.rentalSpace.count({ where }),
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
        return {
            spaces: transformedSpaces,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async getRentalSpaceById(spaceId) {
        const space = await prisma_1.default.rentalSpace.findFirst({
            where: { id: spaceId, availability: true },
            include: {
                vendor: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
            },
        });
        if (!space) {
            throw new Error('Rental space not found');
        }
        return {
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
    }
    static async createBooking(userId, data) {
        const space = await prisma_1.default.rentalSpace.findFirst({
            where: { id: data.spaceId, availability: true },
            include: {
                vendor: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
            },
        });
        if (!space) {
            throw new Error('Rental space not available');
        }
        const existingBooking = await prisma_1.default.rentalBooking.findFirst({
            where: {
                spaceId: data.spaceId,
                status: { not: 'CANCELLED' },
                OR: [
                    {
                        AND: [
                            { startDate: { lte: data.startDate } },
                            { endDate: { gte: data.startDate } },
                        ],
                    },
                    {
                        AND: [
                            { startDate: { lte: data.endDate } },
                            { endDate: { gte: data.endDate } },
                        ],
                    },
                ],
            },
        });
        if (existingBooking) {
            throw new Error('Space already booked for selected dates');
        }
        const booking = await prisma_1.default.rentalBooking.create({
            data: {
                spaceId: data.spaceId,
                userId: userId,
                startDate: data.startDate,
                endDate: data.endDate,
                status: 'PENDING',
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
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        await prisma_1.default.notification.create({
            data: {
                userId: space.vendor.user.id,
                title: 'New Rental Booking',
                message: `New booking request for your space at ${space.location}`,
                type: 'RENTAL',
            },
        });
        return {
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
    }
    static async getUserBookings(userId) {
        const bookings = await prisma_1.default.rentalBooking.findMany({
            where: { userId },
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
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { orderDate: 'desc' },
        });
        return bookings.map(booking => ({
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
    }
    static async getBookingById(userId, bookingId) {
        const booking = await prisma_1.default.rentalBooking.findFirst({
            where: { id: bookingId, userId },
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
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!booking) {
            throw new Error('Booking not found');
        }
        return {
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
    }
    static async cancelBooking(userId, bookingId, reason) {
        const booking = await prisma_1.default.rentalBooking.findFirst({
            where: { id: bookingId, userId },
            include: {
                space: {
                    include: {
                        vendor: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!booking) {
            throw new Error('Booking not found');
        }
        if (booking.status === 'COMPLETED') {
            throw new Error('Cannot cancel completed booking');
        }
        await prisma_1.default.rentalBooking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' },
        });
        await prisma_1.default.notification.create({
            data: {
                userId: booking.space.vendor.user.id,
                title: 'Booking Cancelled',
                message: `Booking for space at ${booking.space.location} has been cancelled`,
                type: 'RENTAL',
            },
        });
        return { message: 'Booking cancelled successfully' };
    }
}
exports.RentalService = RentalService;
//# sourceMappingURL=rental.service.js.map