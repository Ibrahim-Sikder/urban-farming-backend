"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
class VendorService {
    static async getVendorProfile(userId) {
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
                    },
                },
                sustainabilityCert: true,
                produce: {
                    orderBy: { createdAt: 'desc' },
                },
                rentalSpaces: {
                    orderBy: { createdAt: 'desc' },
                },
                orders: {
                    take: 10,
                    orderBy: { orderDate: 'desc' },
                },
            },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const stats = {
            totalProducts: vendor.produce.length,
            totalRentalSpaces: vendor.rentalSpaces.length,
            availableSpaces: vendor.rentalSpaces.filter(s => s.availability).length,
            totalOrders: vendor.orders.length,
            pendingOrders: vendor.orders.filter(o => o.status === 'PENDING').length,
            completedOrders: vendor.orders.filter(o => o.status === 'COMPLETED').length,
            totalRevenue: vendor.orders
                .filter(o => o.status === 'COMPLETED')
                .reduce((sum, o) => sum + o.totalPrice, 0),
        };
        return { ...vendor, stats };
    }
    static async updateVendorProfile(userId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        await prisma_1.default.vendorProfile.update({
            where: { userId },
            data: {
                farmName: data.farmName,
                farmLocation: data.farmLocation,
            },
        });
        return { message: 'Vendor profile updated successfully' };
    }
    static async createProduce(userId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
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
        });
        return produce;
    }
    static async getVendorProduce(userId, page = 1, limit = 10) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const skip = (page - 1) * limit;
        const [produce, total] = await Promise.all([
            prisma_1.default.produce.findMany({
                where: { vendorId: vendor.id },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.default.produce.count({ where: { vendorId: vendor.id } }),
        ]);
        return {
            produce,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async updateProduce(userId, produceId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const produce = await prisma_1.default.produce.findFirst({
            where: { id: produceId, vendorId: vendor.id },
        });
        if (!produce) {
            throw new Error('Produce not found');
        }
        const updated = await prisma_1.default.produce.update({
            where: { id: produceId },
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                availableQuantity: data.availableQuantity,
            },
        });
        return updated;
    }
    static async deleteProduce(userId, produceId) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const produce = await prisma_1.default.produce.findFirst({
            where: { id: produceId, vendorId: vendor.id },
            include: { orders: true },
        });
        if (!produce) {
            throw new Error('Produce not found');
        }
        if (produce.orders.length > 0) {
            throw new Error('Cannot delete produce with existing orders');
        }
        await prisma_1.default.produce.delete({ where: { id: produceId } });
        return { message: 'Produce deleted successfully' };
    }
    static async createRentalSpace(userId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
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
        });
        return space;
    }
    static async getVendorRentalSpaces(userId) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const spaces = await prisma_1.default.rentalSpace.findMany({
            where: { vendorId: vendor.id },
            include: {
                bookings: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return spaces;
    }
    static async updateRentalSpace(userId, spaceId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const space = await prisma_1.default.rentalSpace.findFirst({
            where: { id: spaceId, vendorId: vendor.id },
        });
        if (!space) {
            throw new Error('Rental space not found');
        }
        const updated = await prisma_1.default.rentalSpace.update({
            where: { id: spaceId },
            data: {
                location: data.location,
                size: data.size,
                price: data.price,
                availability: data.availability,
            },
        });
        return updated;
    }
    static async deleteRentalSpace(userId, spaceId) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const space = await prisma_1.default.rentalSpace.findFirst({
            where: { id: spaceId, vendorId: vendor.id },
            include: { bookings: true },
        });
        if (!space) {
            throw new Error('Rental space not found');
        }
        if (space.bookings.length > 0) {
            throw new Error('Cannot delete space with existing bookings');
        }
        await prisma_1.default.rentalSpace.delete({ where: { id: spaceId } });
        return { message: 'Rental space deleted successfully' };
    }
    static async submitCertification(userId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const existingCert = await prisma_1.default.sustainabilityCert.findUnique({
            where: { vendorId: vendor.id },
        });
        if (existingCert) {
            throw new Error('Certification already submitted');
        }
        await prisma_1.default.sustainabilityCert.create({
            data: {
                vendorId: vendor.id,
                certifyingAgency: data.certifyingAgency,
                certificationDate: data.certificationDate,
                expiryDate: data.expiryDate,
                documentUrl: data.documentUrl,
                verificationStatus: 'PENDING',
            },
        });
        return { message: 'Certification submitted successfully' };
    }
    static async getCertificationStatus(userId) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
            include: { sustainabilityCert: true },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        return {
            certificationStatus: vendor.certificationStatus,
            certification: vendor.sustainabilityCert,
        };
    }
    static async getVendorOrders(userId, page = 1, limit = 10, status) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const skip = (page - 1) * limit;
        const where = { vendorId: vendor.id };
        if (status)
            where.status = status;
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
                        },
                    },
                    produce: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            prisma_1.default.order.count({ where }),
        ]);
        return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    static async updateOrderStatus(userId, orderId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const order = await prisma_1.default.order.findFirst({
            where: { id: orderId, vendorId: vendor.id },
        });
        if (!order) {
            throw new Error('Order not found');
        }
        await prisma_1.default.order.update({
            where: { id: orderId },
            data: { status: data.status },
        });
        return { message: 'Order status updated successfully' };
    }
    static async getVendorBookings(userId) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const bookings = await prisma_1.default.rentalBooking.findMany({
            where: { space: { vendorId: vendor.id } },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                space: true,
            },
            orderBy: { orderDate: 'desc' },
        });
        return bookings;
    }
    static async getRevenueReport(userId) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const orders = await prisma_1.default.order.findMany({
            where: {
                vendorId: vendor.id,
                status: 'COMPLETED',
            },
            include: {
                produce: true,
            },
        });
        const productSales = new Map();
        orders.forEach(order => {
            const key = order.produceId;
            if (!productSales.has(key)) {
                productSales.set(key, {
                    productId: order.produce.id,
                    productName: order.produce.name,
                    quantitySold: 0,
                    revenue: 0,
                });
            }
            const product = productSales.get(key);
            product.quantitySold += order.quantity;
            product.revenue += order.totalPrice;
        });
        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
        const totalOrders = orders.length;
        return {
            totalRevenue,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            topProducts,
        };
    }
}
exports.VendorService = VendorService;
//# sourceMappingURL=vendor.service.js.map