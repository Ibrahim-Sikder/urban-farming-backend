"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
class VendorService {
    static async getVendorProfile(userId) {
        try {
            const cacheKey = `vendor:profile:${userId}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma_1.default.vendorProfile.findUnique({
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
                prisma_1.default.produce.count({ where: { vendorId: vendor.id } }),
                prisma_1.default.order.count({ where: { vendorId: vendor.id } }),
                prisma_1.default.order.count({ where: { vendorId: vendor.id, status: client_1.OrderStatus.COMPLETED } }),
                prisma_1.default.order.aggregate({
                    where: { vendorId: vendor.id, status: client_1.OrderStatus.COMPLETED },
                    _sum: { totalPrice: true }
                })
            ]);
            const availableSpaces = await prisma_1.default.rentalSpace.count({
                where: { vendorId: vendor.id, availability: true }
            });
            const pendingOrders = await prisma_1.default.order.count({
                where: { vendorId: vendor.id, status: client_1.OrderStatus.PENDING }
            });
            const response = {
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
            await redis_cache_service_1.default.setFast(cacheKey, response, 300);
            return response;
        }
        catch (error) {
            console.error('Error in getVendorProfile:', error);
            throw new Error(error.message || 'Failed to fetch vendor profile');
        }
    }
    static async updateVendorProfile(userId, data) {
        try {
            const existingVendor = await prisma_1.default.vendorProfile.findUnique({
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
            const updatedVendor = await prisma_1.default.vendorProfile.update({
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
            await redis_cache_service_1.default.del(`vendor:profile:${userId}`);
            const [totalProducts, totalOrders, completedOrders, totalRevenue] = await Promise.all([
                prisma_1.default.produce.count({ where: { vendorId: updatedVendor.id } }),
                prisma_1.default.order.count({ where: { vendorId: updatedVendor.id } }),
                prisma_1.default.order.count({ where: { vendorId: updatedVendor.id, status: client_1.OrderStatus.COMPLETED } }),
                prisma_1.default.order.aggregate({
                    where: { vendorId: updatedVendor.id, status: client_1.OrderStatus.COMPLETED },
                    _sum: { totalPrice: true }
                })
            ]);
            const availableSpaces = await prisma_1.default.rentalSpace.count({
                where: { vendorId: updatedVendor.id, availability: true }
            });
            const pendingOrders = await prisma_1.default.order.count({
                where: { vendorId: updatedVendor.id, status: client_1.OrderStatus.PENDING }
            });
            const response = {
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
        }
        catch (error) {
            console.error('Error in updateVendorProfile:', error);
            if (error.code === 'P2025') {
                throw new Error('Vendor profile not found');
            }
            throw new Error(error.message || 'Failed to update vendor profile');
        }
    }
    static async createProduce(userId, data) {
        try {
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId },
                select: { id: true, certificationStatus: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            const produce = await prisma_1.default.produce.create({
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
                redis_cache_service_1.default.del(`vendor:profile:${userId}`),
                redis_cache_service_1.default.delPattern(`vendor:produce:${userId}:*`)
            ]);
            return produce;
        }
        catch (error) {
            console.error('Error in createProduce:', error);
            throw new Error(error.message || 'Failed to create produce');
        }
    }
    static async getVendorProduce(userId, queryParams = {}) {
        try {
            const cacheKey = `vendor:produce:${userId}:${JSON.stringify(queryParams)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            const page = queryParams.page || 1;
            const limit = queryParams.limit || 10;
            const skip = (page - 1) * limit;
            const where = {
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
                prisma_1.default.produce.findMany({
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
                prisma_1.default.produce.count({ where })
            ]);
            const totalPages = Math.ceil(total / limit);
            const response = {
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
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            console.error('Error in getVendorProduce:', error);
            throw new Error(error.message || 'Failed to fetch produce');
        }
    }
    static async updateProduce(userId, produceId, data) {
        try {
            const produce = await prisma_1.default.produce.findFirst({
                where: {
                    id: produceId,
                    vendor: { userId }
                }
            });
            if (!produce) {
                throw new Error('Produce not found or unauthorized');
            }
            const updateData = {};
            if (data.name !== undefined)
                updateData.name = data.name;
            if (data.description !== undefined)
                updateData.description = data.description;
            if (data.price !== undefined)
                updateData.price = data.price;
            if (data.category !== undefined)
                updateData.category = data.category;
            if (data.availableQuantity !== undefined)
                updateData.availableQuantity = data.availableQuantity;
            updateData.updatedAt = new Date();
            const updatedProduce = await prisma_1.default.produce.update({
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
                redis_cache_service_1.default.del(`vendor:profile:${userId}`),
                redis_cache_service_1.default.delPattern(`vendor:produce:${userId}:*`),
                redis_cache_service_1.default.del(`produce:${produceId}`)
            ]);
            return updatedProduce;
        }
        catch (error) {
            console.error('Error in updateProduce:', error);
            if (error.code === 'P2025') {
                throw new Error('Produce not found');
            }
            throw new Error(error.message || 'Failed to update produce');
        }
    }
    static async deleteProduce(userId, produceId) {
        try {
            const orders = await prisma_1.default.order.findFirst({
                where: { produceId }
            });
            if (orders) {
                throw new Error('Cannot delete produce with existing orders');
            }
            const result = await prisma_1.default.produce.deleteMany({
                where: {
                    id: produceId,
                    vendor: { userId }
                }
            });
            if (result.count === 0) {
                throw new Error('Produce not found or unauthorized');
            }
            await Promise.all([
                redis_cache_service_1.default.del(`vendor:profile:${userId}`),
                redis_cache_service_1.default.delPattern(`vendor:produce:${userId}:*`),
                redis_cache_service_1.default.del(`produce:${produceId}`)
            ]);
            return { message: 'Produce deleted successfully' };
        }
        catch (error) {
            console.error('Error in deleteProduce:', error);
            throw new Error(error.message || 'Failed to delete produce');
        }
    }
    static async createRentalSpace(userId, data) {
        try {
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            const space = await prisma_1.default.rentalSpace.create({
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
                redis_cache_service_1.default.del(`vendor:profile:${userId}`),
                redis_cache_service_1.default.del(`vendor:rental:spaces:${userId}`),
                redis_cache_service_1.default.delPattern('rental:spaces:*')
            ]);
            return space;
        }
        catch (error) {
            console.error('Error in createRentalSpace:', error);
            throw new Error(error.message || 'Failed to create rental space');
        }
    }
    static async getVendorRentalSpaces(userId) {
        try {
            const cacheKey = `vendor:rental:spaces:${userId}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            const spaces = await prisma_1.default.rentalSpace.findMany({
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
            await redis_cache_service_1.default.setFast(cacheKey, spacesWithCount, 300);
            return spacesWithCount;
        }
        catch (error) {
            console.error('Error in getVendorRentalSpaces:', error);
            throw new Error(error.message || 'Failed to fetch rental spaces');
        }
    }
    static async updateRentalSpace(userId, spaceId, data) {
        try {
            const space = await prisma_1.default.rentalSpace.findFirst({
                where: {
                    id: spaceId,
                    vendor: { userId }
                }
            });
            if (!space) {
                throw new Error('Rental space not found or unauthorized');
            }
            const updateData = {};
            if (data.location !== undefined)
                updateData.location = data.location;
            if (data.size !== undefined)
                updateData.size = data.size;
            if (data.price !== undefined)
                updateData.price = data.price;
            if (data.availability !== undefined)
                updateData.availability = data.availability;
            updateData.updatedAt = new Date();
            const updatedSpace = await prisma_1.default.rentalSpace.update({
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
                redis_cache_service_1.default.del(`vendor:profile:${userId}`),
                redis_cache_service_1.default.del(`vendor:rental:spaces:${userId}`),
                redis_cache_service_1.default.delPattern('rental:spaces:*'),
                redis_cache_service_1.default.del(`rental:space:${spaceId}`)
            ]);
            return updatedSpace;
        }
        catch (error) {
            console.error('Error in updateRentalSpace:', error);
            throw new Error(error.message || 'Failed to update rental space');
        }
    }
    static async deleteRentalSpace(userId, spaceId) {
        try {
            const bookings = await prisma_1.default.rentalBooking.findFirst({
                where: { spaceId }
            });
            if (bookings) {
                throw new Error('Cannot delete space with existing bookings');
            }
            const result = await prisma_1.default.rentalSpace.deleteMany({
                where: {
                    id: spaceId,
                    vendor: { userId }
                }
            });
            if (result.count === 0) {
                throw new Error('Rental space not found or unauthorized');
            }
            await Promise.all([
                redis_cache_service_1.default.del(`vendor:profile:${userId}`),
                redis_cache_service_1.default.del(`vendor:rental:spaces:${userId}`),
                redis_cache_service_1.default.delPattern('rental:spaces:*'),
                redis_cache_service_1.default.del(`rental:space:${spaceId}`)
            ]);
            return { message: 'Rental space deleted successfully' };
        }
        catch (error) {
            console.error('Error in deleteRentalSpace:', error);
            throw new Error(error.message || 'Failed to delete rental space');
        }
    }
    static async submitCertification(userId, data) {
        try {
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId },
                include: { sustainabilityCert: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            if (vendor.sustainabilityCert) {
                throw new Error('Certification already submitted');
            }
            await prisma_1.default.sustainabilityCert.create({
                data: {
                    vendorId: vendor.id,
                    certifyingAgency: data.certifyingAgency,
                    certificationDate: data.certificationDate,
                    expiryDate: data.expiryDate,
                    documentUrl: data.documentUrl,
                    verificationStatus: client_1.CertificationStatus.PENDING,
                }
            });
            await prisma_1.default.vendorProfile.update({
                where: { userId },
                data: { certificationStatus: client_1.CertificationStatus.PENDING }
            });
            await Promise.all([
                redis_cache_service_1.default.del(`vendor:profile:${userId}`),
                redis_cache_service_1.default.del(`vendor:cert:${userId}`)
            ]);
            return { message: 'Certification submitted successfully' };
        }
        catch (error) {
            console.error('Error in submitCertification:', error);
            throw new Error(error.message || 'Failed to submit certification');
        }
    }
    static async getCertificationStatus(userId) {
        try {
            const cacheKey = `vendor:cert:${userId}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma_1.default.vendorProfile.findUnique({
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
            await redis_cache_service_1.default.setFast(cacheKey, result, 300);
            return result;
        }
        catch (error) {
            console.error('Error in getCertificationStatus:', error);
            throw new Error(error.message || 'Failed to fetch certification status');
        }
    }
    static async getVendorOrders(userId, queryParams = {}) {
        try {
            const cacheKey = `vendor:orders:${userId}:${JSON.stringify(queryParams)}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            const page = queryParams.page || 1;
            const limit = queryParams.limit || 10;
            const skip = (page - 1) * limit;
            const where = {
                vendorId: vendor.id
            };
            if (queryParams.status) {
                where.status = queryParams.status;
            }
            const [orders, total] = await Promise.all([
                prisma_1.default.order.findMany({
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
                prisma_1.default.order.count({ where })
            ]);
            const transformedOrders = orders.map(order => ({
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
            const response = {
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
            await redis_cache_service_1.default.setFast(cacheKey, response, 120);
            return response;
        }
        catch (error) {
            throw new Error(error.message || 'Failed to fetch orders');
        }
    }
    static async updateOrderStatus(userId, orderId, data) {
        try {
            const order = await prisma_1.default.order.findFirst({
                where: {
                    id: orderId,
                    vendor: { userId }
                }
            });
            if (!order) {
                throw new Error('Order not found or unauthorized');
            }
            await prisma_1.default.order.update({
                where: { id: orderId },
                data: { status: data.status }
            });
            await Promise.all([
                redis_cache_service_1.default.delPattern(`vendor:orders:${userId}:*`),
                redis_cache_service_1.default.del(`order:${orderId}`)
            ]);
            return { message: 'Order status updated successfully' };
        }
        catch (error) {
            throw new Error(error.message || 'Failed to update order status');
        }
    }
    static async getVendorBookings(userId) {
        try {
            const cacheKey = `vendor:bookings:${userId}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            const bookings = await prisma_1.default.rentalBooking.findMany({
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
            const transformedBookings = bookings.map(booking => ({
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
            await redis_cache_service_1.default.setFast(cacheKey, transformedBookings, 300);
            return transformedBookings;
        }
        catch (error) {
            console.error('Error in getVendorBookings:', error);
            throw new Error(error.message || 'Failed to fetch bookings');
        }
    }
    static async getRevenueReport(userId) {
        try {
            const cacheKey = `vendor:revenue:${userId}`;
            const cached = await redis_cache_service_1.default.getFast(cacheKey);
            if (cached) {
                return cached;
            }
            const vendor = await prisma_1.default.vendorProfile.findUnique({
                where: { userId },
                select: { id: true }
            });
            if (!vendor) {
                throw new Error('Vendor profile not found');
            }
            const [revenueStats, topProducts] = await Promise.all([
                prisma_1.default.order.aggregate({
                    where: {
                        vendorId: vendor.id,
                        status: client_1.OrderStatus.COMPLETED
                    },
                    _sum: { totalPrice: true },
                    _count: { id: true },
                    _avg: { totalPrice: true }
                }),
                prisma_1.default.order.groupBy({
                    by: ['produceId'],
                    where: {
                        vendorId: vendor.id,
                        status: client_1.OrderStatus.COMPLETED
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
            const productDetails = await Promise.all(topProducts.map(async (product) => {
                const produce = await prisma_1.default.produce.findUnique({
                    where: { id: product.produceId },
                    select: { id: true, name: true }
                });
                return {
                    productId: produce?.id || 0,
                    productName: produce?.name || 'Unknown',
                    quantitySold: product._sum.quantity || 0,
                    revenue: product._sum.totalPrice || 0,
                };
            }));
            const response = {
                totalRevenue: revenueStats._sum.totalPrice || 0,
                totalOrders: revenueStats._count.id || 0,
                averageOrderValue: revenueStats._avg.totalPrice || 0,
                topProducts: productDetails,
            };
            await redis_cache_service_1.default.setFast(cacheKey, response, 300);
            return response;
        }
        catch (error) {
            console.error('Error in getRevenueReport:', error);
            throw new Error(error.message || 'Failed to generate revenue report');
        }
    }
}
exports.VendorService = VendorService;
//# sourceMappingURL=vendor.service.js.map