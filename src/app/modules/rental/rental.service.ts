// modules/rental/rental.service.ts
import prisma from '../../config/prisma';
import { OrderStatus } from '@prisma/client';
import {
    CreateRentalBookingInput,
    UpdateRentalBookingInput,
    SearchRentalSpaceInput,
    RentalSpaceResponse,
    RentalBookingResponse,
    PaginatedRentalSpacesResponse
} from './rental.type';

export class RentalService {

    // ============ SEARCH RENTAL SPACES ============
    static async searchRentalSpaces(filters: SearchRentalSpaceInput): Promise<PaginatedRentalSpacesResponse> {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};

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
        } else {
            where.availability = true;
        }

        const [spaces, total] = await Promise.all([
            prisma.rentalSpace.findMany({
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
            prisma.rentalSpace.count({ where }),
        ]);

        // Transform the data to match RentalSpaceResponse type
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

    static async getRentalSpaceById(spaceId: number): Promise<RentalSpaceResponse> {
        const space = await prisma.rentalSpace.findFirst({
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

    // ============ RENTAL BOOKINGS ============
    static async createBooking(userId: number, data: CreateRentalBookingInput): Promise<RentalBookingResponse> {
        const space = await prisma.rentalSpace.findFirst({
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

        // Check for overlapping bookings
        const existingBooking = await prisma.rentalBooking.findFirst({
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

        const booking = await prisma.rentalBooking.create({
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

        // Create notification for vendor
        await prisma.notification.create({
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

    static async getUserBookings(userId: number): Promise<RentalBookingResponse[]> {
        const bookings = await prisma.rentalBooking.findMany({
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

    static async getBookingById(userId: number, bookingId: number): Promise<RentalBookingResponse> {
        const booking = await prisma.rentalBooking.findFirst({
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

    static async cancelBooking(userId: number, bookingId: number, reason?: string): Promise<{ message: string }> {
        const booking = await prisma.rentalBooking.findFirst({
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

        await prisma.rentalBooking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' },
        });

        await prisma.notification.create({
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