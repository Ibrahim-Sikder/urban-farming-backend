
import { CertificationStatus, OrderStatus, Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import {
    CreateProduceInput,
    CreateRentalSpaceInput,
    MessageResponse,
    PaginatedResponse,
    RevenueReportResponse,
    SubmitCertificationInput,
    UpdateOrderStatusInput,
    UpdateProduceInput,
    UpdateRentalSpaceInput,
    UpdateVendorProfileInput,
    VendorBookingResponse,
    VendorOrderQueryParams,
    VendorOrderResponse,
    VendorProduceQueryParams,
    VendorProduceResponse,
    VendorProfileResponse
} from './vendor.type';

export class VendorService {

    static async getVendorProfile(userId: number): Promise<VendorProfileResponse> {
        try {
            const cacheKey = `vendor:profile:${userId}`;
            const cached = await RedisCacheService.getFast<VendorProfileResponse>(cacheKey);
            if (cached) {
                return cached;
            }

            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phoneNumber: true,
                            address: true,
                        }
                    },
                    produce: {
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                            category: true,
                            certificationStatus: true,
                            availableQuantity: true,
                            createdAt: true,
                            updatedAt: true,
                        }
                    },
                    rentalSpaces: {
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                        select: {
                            id: true,
                            location: true,
                            size: true,
                            price: true,
                            availability: true,
                            createdAt: true,
                            updatedAt: true,
                        }
                    },
                    sustainabilityCert: true
                }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const [totalProducts, totalOrders, completedOrders, totalRevenue] = await Promise.all([
                prisma.produce.count({ where: { vendorId: vendor.id } }),
                prisma.order.count({ where: { vendorId: vendor.id } }),
                prisma.order.count({ where: { vendorId: vendor.id, status: OrderStatus.COMPLETED } }),
                prisma.order.aggregate({
                    where: { vendorId: vendor.id, status: OrderStatus.COMPLETED },
                    _sum: { totalPrice: true }
                })
            ]);

            const availableSpaces = await prisma.rentalSpace.count({
                where: { vendorId: vendor.id, availability: true }
            });

            const pendingOrders = await prisma.order.count({
                where: { vendorId: vendor.id, status: OrderStatus.PENDING }
            });

            const response: VendorProfileResponse = {
                id: vendor.id,
                farmName: vendor.farmName,
                farmLocation: vendor.farmLocation,
                certificationStatus: vendor.certificationStatus,
                user: {
                    id: vendor.user.id,
                    name: vendor.user.name,
                    email: vendor.user.email,
                    phoneNumber: vendor.user.phoneNumber || undefined,
                    address: vendor.user.address || undefined,
                },
                stats: {
                    totalProducts,
                    totalRentalSpaces: vendor.rentalSpaces.length,
                    availableSpaces,
                    totalOrders,
                    pendingOrders,
                    completedOrders,
                    totalRevenue: totalRevenue._sum.totalPrice || 0,
                },
                produce: vendor.produce,
                rentalSpaces: vendor.rentalSpaces,
                sustainabilityCert: vendor.sustainabilityCert || undefined,
                createdAt: vendor.createdAt,
                updatedAt: vendor.updatedAt,
            };

            // Cache for 5 minutes
            await RedisCacheService.setFast(cacheKey, response, 300);

            return response;
        } catch (error: any) {
            console.error('Error in getVendorProfile:', error);
            throw new Error(error.message || 'Failed to fetch vendor profile');
        }
    }

    static async updateVendorProfile(userId: number, data: UpdateVendorProfileInput): Promise<VendorProfileResponse> {
        try {
            const existingVendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phoneNumber: true,
                            address: true,
                        }
                    }
                }
            });

            if (!existingVendor) {
                throw new Error('Vendor profile not found');
            }

            const updatedVendor = await prisma.vendorProfile.update({
                where: { userId },
                data: {
                    ...(data.farmName !== undefined && { farmName: data.farmName }),
                    ...(data.farmLocation !== undefined && { farmLocation: data.farmLocation }),
                    updatedAt: new Date(),
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phoneNumber: true,
                            address: true,
                        }
                    },
                    produce: {
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            availableQuantity: true,
                        }
                    },
                    rentalSpaces: {
                        where: { availability: true },
                        take: 5,
                        select: {
                            id: true,
                            location: true,
                            price: true,
                        }
                    },
                    sustainabilityCert: true
                }
            });


            await RedisCacheService.del(`vendor:profile:${userId}`);

            const [totalProducts, totalOrders, completedOrders, totalRevenue] = await Promise.all([
                prisma.produce.count({ where: { vendorId: updatedVendor.id } }),
                prisma.order.count({ where: { vendorId: updatedVendor.id } }),
                prisma.order.count({ where: { vendorId: updatedVendor.id, status: OrderStatus.COMPLETED } }),
                prisma.order.aggregate({
                    where: { vendorId: updatedVendor.id, status: OrderStatus.COMPLETED },
                    _sum: { totalPrice: true }
                })
            ]);

            const availableSpaces = await prisma.rentalSpace.count({
                where: { vendorId: updatedVendor.id, availability: true }
            });

            const pendingOrders = await prisma.order.count({
                where: { vendorId: updatedVendor.id, status: OrderStatus.PENDING }
            });

            const response: VendorProfileResponse = {
                id: updatedVendor.id,
                farmName: updatedVendor.farmName,
                farmLocation: updatedVendor.farmLocation,
                certificationStatus: updatedVendor.certificationStatus,
                user: {
                    id: updatedVendor.user.id,
                    name: updatedVendor.user.name,
                    email: updatedVendor.user.email,
                    phoneNumber: updatedVendor.user.phoneNumber || undefined,
                    address: updatedVendor.user.address || undefined,
                },
                stats: {
                    totalProducts,
                    totalRentalSpaces: updatedVendor.rentalSpaces.length,
                    availableSpaces,
                    totalOrders,
                    pendingOrders,
                    completedOrders,
                    totalRevenue: totalRevenue._sum.totalPrice || 0,
                },
                produce: updatedVendor.produce,
                rentalSpaces: updatedVendor.rentalSpaces,
                sustainabilityCert: updatedVendor.sustainabilityCert || undefined,
                createdAt: updatedVendor.createdAt,
                updatedAt: updatedVendor.updatedAt,
            };

            return response;
        } catch (error: any) {
            console.error('Error in updateVendorProfile:', error);
            if (error.code === 'P2025') {
                throw new Error('Vendor profile not found');
            }
            throw new Error(error.message || 'Failed to update vendor profile');
        }
    }


    static async createProduce(userId: number, data: CreateProduceInput): Promise<VendorProduceResponse> {
        try {

            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                select: { id: true, certificationStatus: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const produce = await prisma.produce.create({
                data: {
                    vendorId: vendor.id,
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    category: data.category,
                    availableQuantity: data.availableQuantity,
                    certificationStatus: vendor.certificationStatus,
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    category: true,
                    certificationStatus: true,
                    availableQuantity: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });

            await Promise.all([
                RedisCacheService.del(`vendor:profile:${userId}`),
                RedisCacheService.delPattern(`vendor:produce:${userId}:*`)
            ]);

            return produce;
        } catch (error: any) {
            console.error('Error in createProduce:', error);
            throw new Error(error.message || 'Failed to create produce');
        }
    }

    static async getVendorProduce(
        userId: number,
        queryParams: VendorProduceQueryParams = {}
    ): Promise<PaginatedResponse<VendorProduceResponse>> {
        try {
            const cacheKey = `vendor:produce:${userId}:${JSON.stringify(queryParams)}`;

            const cached = await RedisCacheService.getFast<PaginatedResponse<VendorProduceResponse>>(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const page = queryParams.page || 1;
            const limit = queryParams.limit || 10;
            const skip = (page - 1) * limit;
            const where: Prisma.ProduceWhereInput = {
                vendorId: vendor.id
            };

            if (queryParams.searchTerm) {
                where.OR = [
                    { name: { contains: queryParams.searchTerm, mode: 'insensitive' } },
                    { description: { contains: queryParams.searchTerm, mode: 'insensitive' } },
                    { category: { contains: queryParams.searchTerm, mode: 'insensitive' } },
                ];
            }

            if (queryParams.category) {
                where.category = queryParams.category;
            }

            if (queryParams.certificationStatus) {
                where.certificationStatus = queryParams.certificationStatus;
            }

            if (queryParams.minPrice !== undefined || queryParams.maxPrice !== undefined) {
                where.price = {};
                if (queryParams.minPrice !== undefined) {
                    where.price.gte = queryParams.minPrice;
                }
                if (queryParams.maxPrice !== undefined) {
                    where.price.lte = queryParams.maxPrice;
                }
            }

            const sortOrder = queryParams.sortOrder === 'asc' ? 'asc' : 'desc';
            const sortBy = queryParams.sortBy || 'createdAt';

            const [produce, total] = await Promise.all([
                prisma.produce.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        price: true,
                        category: true,
                        certificationStatus: true,
                        availableQuantity: true,
                        createdAt: true,
                        updatedAt: true,
                    }
                }),
                prisma.produce.count({ where })
            ]);

            const totalPages = Math.ceil(total / limit);

            const response: PaginatedResponse<VendorProduceResponse> = {
                data: produce,
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
            console.error('Error in getVendorProduce:', error);
            throw new Error(error.message || 'Failed to fetch produce');
        }
    }

    static async updateProduce(userId: number, produceId: number, data: UpdateProduceInput): Promise<VendorProduceResponse> {
        try {
            const produce = await prisma.produce.findFirst({
                where: {
                    id: produceId,
                    vendor: { userId }
                }
            });

            if (!produce) {
                throw new Error('Produce not found or unauthorized');
            }

            const updateData: Prisma.ProduceUpdateInput = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.price !== undefined) updateData.price = data.price;
            if (data.category !== undefined) updateData.category = data.category;
            if (data.availableQuantity !== undefined) updateData.availableQuantity = data.availableQuantity;
            updateData.updatedAt = new Date();

            const updatedProduce = await prisma.produce.update({
                where: { id: produceId },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    category: true,
                    certificationStatus: true,
                    availableQuantity: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });
            await Promise.all([
                RedisCacheService.del(`vendor:profile:${userId}`),
                RedisCacheService.delPattern(`vendor:produce:${userId}:*`),
                RedisCacheService.del(`produce:${produceId}`)
            ]);

            return updatedProduce;
        } catch (error: any) {
            console.error('Error in updateProduce:', error);
            if (error.code === 'P2025') {
                throw new Error('Produce not found');
            }
            throw new Error(error.message || 'Failed to update produce');
        }
    }

    static async deleteProduce(userId: number, produceId: number): Promise<MessageResponse> {
        try {
            const orders = await prisma.order.findFirst({
                where: { produceId }
            });

            if (orders) {
                throw new Error('Cannot delete produce with existing orders');
            }
            const result = await prisma.produce.deleteMany({
                where: {
                    id: produceId,
                    vendor: { userId }
                }
            });

            if (result.count === 0) {
                throw new Error('Produce not found or unauthorized');
            }
            await Promise.all([
                RedisCacheService.del(`vendor:profile:${userId}`),
                RedisCacheService.delPattern(`vendor:produce:${userId}:*`),
                RedisCacheService.del(`produce:${produceId}`)
            ]);

            return { message: 'Produce deleted successfully' };
        } catch (error: any) {
            console.error('Error in deleteProduce:', error);
            throw new Error(error.message || 'Failed to delete produce');
        }
    }

    static async createRentalSpace(userId: number, data: CreateRentalSpaceInput): Promise<any> {
        try {
            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const space = await prisma.rentalSpace.create({
                data: {
                    vendorId: vendor.id,
                    location: data.location,
                    size: data.size,
                    price: data.price,
                    availability: true,
                },
                select: {
                    id: true,
                    location: true,
                    size: true,
                    price: true,
                    availability: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });
            await Promise.all([
                RedisCacheService.del(`vendor:profile:${userId}`),
                RedisCacheService.del(`vendor:rental:spaces:${userId}`),
                RedisCacheService.delPattern('rental:spaces:*')
            ]);

            return space;
        } catch (error: any) {
            console.error('Error in createRentalSpace:', error);
            throw new Error(error.message || 'Failed to create rental space');
        }
    }

    static async getVendorRentalSpaces(userId: number): Promise<any[]> {
        try {
            const cacheKey = `vendor:rental:spaces:${userId}`;

            const cached = await RedisCacheService.getFast<any[]>(cacheKey);
            if (cached) {
                return cached;
            }

            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const spaces = await prisma.rentalSpace.findMany({
                where: { vendorId: vendor.id },
                include: {
                    bookings: {
                        select: {
                            id: true,
                            status: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            const spacesWithCount = spaces.map(space => ({
                id: space.id,
                location: space.location,
                size: space.size,
                price: space.price,
                availability: space.availability,
                createdAt: space.createdAt,
                updatedAt: space.updatedAt,
                vendorId: space.vendorId,
                bookings_count: space.bookings.length
            }));

            await RedisCacheService.setFast(cacheKey, spacesWithCount, 300);

            return spacesWithCount;
        } catch (error: any) {
            console.error('Error in getVendorRentalSpaces:', error);
            throw new Error(error.message || 'Failed to fetch rental spaces');
        }
    }

    static async updateRentalSpace(userId: number, spaceId: number, data: UpdateRentalSpaceInput): Promise<any> {
        try {
            const space = await prisma.rentalSpace.findFirst({
                where: {
                    id: spaceId,
                    vendor: { userId }
                }
            });

            if (!space) {
                throw new Error('Rental space not found or unauthorized');
            }

            const updateData: Prisma.RentalSpaceUpdateInput = {};
            if (data.location !== undefined) updateData.location = data.location;
            if (data.size !== undefined) updateData.size = data.size;
            if (data.price !== undefined) updateData.price = data.price;
            if (data.availability !== undefined) updateData.availability = data.availability;
            updateData.updatedAt = new Date();

            const updatedSpace = await prisma.rentalSpace.update({
                where: { id: spaceId },
                data: updateData,
                select: {
                    id: true,
                    location: true,
                    size: true,
                    price: true,
                    availability: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });
            await Promise.all([
                RedisCacheService.del(`vendor:profile:${userId}`),
                RedisCacheService.del(`vendor:rental:spaces:${userId}`),
                RedisCacheService.delPattern('rental:spaces:*'),
                RedisCacheService.del(`rental:space:${spaceId}`)
            ]);

            return updatedSpace;
        } catch (error: any) {
            console.error('Error in updateRentalSpace:', error);
            throw new Error(error.message || 'Failed to update rental space');
        }
    }

    static async deleteRentalSpace(userId: number, spaceId: number): Promise<MessageResponse> {
        try {
            const bookings = await prisma.rentalBooking.findFirst({
                where: { spaceId }
            });

            if (bookings) {
                throw new Error('Cannot delete space with existing bookings');
            }

            const result = await prisma.rentalSpace.deleteMany({
                where: {
                    id: spaceId,
                    vendor: { userId }
                }
            });

            if (result.count === 0) {
                throw new Error('Rental space not found or unauthorized');
            }
            await Promise.all([
                RedisCacheService.del(`vendor:profile:${userId}`),
                RedisCacheService.del(`vendor:rental:spaces:${userId}`),
                RedisCacheService.delPattern('rental:spaces:*'),
                RedisCacheService.del(`rental:space:${spaceId}`)
            ]);

            return { message: 'Rental space deleted successfully' };
        } catch (error: any) {
            console.error('Error in deleteRentalSpace:', error);
            throw new Error(error.message || 'Failed to delete rental space');
        }
    }

    static async submitCertification(userId: number, data: SubmitCertificationInput): Promise<MessageResponse> {
        try {
            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                include: { sustainabilityCert: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            if (vendor.sustainabilityCert) {
                throw new Error('Certification already submitted');
            }

            await prisma.sustainabilityCert.create({
                data: {
                    vendorId: vendor.id,
                    certifyingAgency: data.certifyingAgency,
                    certificationDate: data.certificationDate,
                    expiryDate: data.expiryDate,
                    documentUrl: data.documentUrl,
                    verificationStatus: CertificationStatus.PENDING,
                }
            });

            await prisma.vendorProfile.update({
                where: { userId },
                data: { certificationStatus: CertificationStatus.PENDING }
            });

            await Promise.all([
                RedisCacheService.del(`vendor:profile:${userId}`),
                RedisCacheService.del(`vendor:cert:${userId}`)
            ]);

            return { message: 'Certification submitted successfully' };
        } catch (error: any) {
            console.error('Error in submitCertification:', error);
            throw new Error(error.message || 'Failed to submit certification');
        }
    }

    static async getCertificationStatus(userId: number): Promise<any> {
        try {
            const cacheKey = `vendor:cert:${userId}`;

            const cached = await RedisCacheService.getFast<any>(cacheKey);
            if (cached) {
                return cached;
            }

            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                include: {
                    sustainabilityCert: true
                }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const result = {
                certificationStatus: vendor.certificationStatus,
                certification: vendor.sustainabilityCert || null,
            };

            await RedisCacheService.setFast(cacheKey, result, 300);

            return result;
        } catch (error: any) {
            console.error('Error in getCertificationStatus:', error);
            throw new Error(error.message || 'Failed to fetch certification status');
        }
    }

    static async getVendorOrders(
        userId: number,
        queryParams: VendorOrderQueryParams = {}
    ): Promise<PaginatedResponse<VendorOrderResponse>> {
        try {
            const cacheKey = `vendor:orders:${userId}:${JSON.stringify(queryParams)}`;

            const cached = await RedisCacheService.getFast<PaginatedResponse<VendorOrderResponse>>(cacheKey);
            if (cached) {
                return cached;
            }

            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const page = queryParams.page || 1;
            const limit = queryParams.limit || 10;
            const skip = (page - 1) * limit;

            const where: Prisma.OrderWhereInput = {
                vendorId: vendor.id
            };

            if (queryParams.status) {
                where.status = queryParams.status;
            }

            const [orders, total] = await Promise.all([
                prisma.order.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { orderDate: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        },
                        produce: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                            }
                        }
                    }
                }),
                prisma.order.count({ where })
            ]);

            const transformedOrders: VendorOrderResponse[] = orders.map(order => ({
                id: order.id,
                quantity: order.quantity,
                totalPrice: order.totalPrice,
                status: order.status,
                orderDate: order.orderDate,
                user: {
                    id: order.user.id,
                    name: order.user.name,
                    email: order.user.email,
                },
                produce: {
                    id: order.produce.id,
                    name: order.produce.name,
                },
            }));

            const totalPages = Math.ceil(total / limit);

            const response: PaginatedResponse<VendorOrderResponse> = {
                data: transformedOrders,
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

            throw new Error(error.message || 'Failed to fetch orders');
        }
    }

    static async updateOrderStatus(userId: number, orderId: number, data: UpdateOrderStatusInput): Promise<MessageResponse> {
        try {
            const order = await prisma.order.findFirst({
                where: {
                    id: orderId,
                    vendor: { userId }
                }
            });

            if (!order) {
                throw new Error('Order not found or unauthorized');
            }

            await prisma.order.update({
                where: { id: orderId },
                data: { status: data.status }
            });

            await Promise.all([
                RedisCacheService.delPattern(`vendor:orders:${userId}:*`),
                RedisCacheService.del(`order:${orderId}`)
            ]);

            return { message: 'Order status updated successfully' };
        } catch (error: any) {

            throw new Error(error.message || 'Failed to update order status');
        }
    }

    static async getVendorBookings(userId: number): Promise<VendorBookingResponse[]> {
        try {
            const cacheKey = `vendor:bookings:${userId}`;

            const cached = await RedisCacheService.getFast<VendorBookingResponse[]>(cacheKey);
            if (cached) {
                return cached;
            }

            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const bookings = await prisma.rentalBooking.findMany({
                where: {
                    space: {
                        vendorId: vendor.id
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    space: {
                        select: {
                            location: true,
                            size: true,
                            price: true,
                        }
                    }
                },
                orderBy: { orderDate: 'desc' }
            });

            const transformedBookings: VendorBookingResponse[] = bookings.map(booking => ({
                id: booking.id,
                spaceId: booking.spaceId,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: booking.status,
                orderDate: booking.orderDate,
                user: {
                    id: booking.user.id,
                    name: booking.user.name,
                    email: booking.user.email,
                },
                space: {
                    location: booking.space.location,
                    size: booking.space.size,
                    price: booking.space.price,
                },
            }));

            await RedisCacheService.setFast(cacheKey, transformedBookings, 300);

            return transformedBookings;
        } catch (error: any) {
            console.error('Error in getVendorBookings:', error);
            throw new Error(error.message || 'Failed to fetch bookings');
        }
    }



    static async getRevenueReport(userId: number): Promise<RevenueReportResponse> {
        try {
            const cacheKey = `vendor:revenue:${userId}`;

            const cached = await RedisCacheService.getFast<RevenueReportResponse>(cacheKey);
            if (cached) {
                return cached;
            }

            const vendor = await prisma.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!vendor) {
                throw new Error('Vendor profile not found');
            }

            const [revenueStats, topProducts] = await Promise.all([
                prisma.order.aggregate({
                    where: {
                        vendorId: vendor.id,
                        status: OrderStatus.COMPLETED
                    },
                    _sum: { totalPrice: true },
                    _count: { id: true },
                    _avg: { totalPrice: true }
                }),
                prisma.order.groupBy({
                    by: ['produceId'],
                    where: {
                        vendorId: vendor.id,
                        status: OrderStatus.COMPLETED
                    },
                    _sum: {
                        quantity: true,
                        totalPrice: true
                    },
                    orderBy: {
                        _sum: {
                            totalPrice: 'desc'
                        }
                    },
                    take: 10
                })
            ]);

            const productDetails = await Promise.all(
                topProducts.map(async (product) => {
                    const produce = await prisma.produce.findUnique({
                        where: { id: product.produceId },
                        select: { id: true, name: true }
                    });
                    return {
                        productId: produce?.id || 0,
                        productName: produce?.name || 'Unknown',
                        quantitySold: product._sum.quantity || 0,
                        revenue: product._sum.totalPrice || 0,
                    };
                })
            );

            const response: RevenueReportResponse = {
                totalRevenue: revenueStats._sum.totalPrice || 0,
                totalOrders: revenueStats._count.id || 0,
                averageOrderValue: revenueStats._avg.totalPrice || 0,
                topProducts: productDetails,
            };

            await RedisCacheService.setFast(cacheKey, response, 300);

            return response;
        } catch (error: any) {
            console.error('Error in getRevenueReport:', error);
            throw new Error(error.message || 'Failed to generate revenue report');
        }
    }
}