"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
class AdminService {
    static async getDashboardStats(filters) {
        const whereDate = {};
        if (filters?.startDate)
            whereDate.gte = filters.startDate;
        if (filters?.endDate)
            whereDate.lte = filters.endDate;
        const [totalUsers, totalVendors, totalCustomers, totalOrders, pendingVendors, pendingCertifications, totalRentalSpaces, recentOrders, recentUsers] = await Promise.all([
            prisma_1.default.user.count({ where: { deletedAt: null } }),
            prisma_1.default.vendorProfile.count(),
            prisma_1.default.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
            prisma_1.default.order.count(),
            prisma_1.default.vendorProfile.count({ where: { certificationStatus: 'PENDING' } }),
            prisma_1.default.sustainabilityCert.count({ where: { verificationStatus: 'PENDING' } }),
            prisma_1.default.rentalSpace.count(),
            prisma_1.default.order.findMany({
                take: 10,
                orderBy: { orderDate: 'desc' },
                include: {
                    user: { select: { name: true, email: true } }
                }
            }),
            prisma_1.default.user.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                where: { deletedAt: null },
                select: { id: true, name: true, email: true, role: true, createdAt: true }
            })
        ]);
        const totalRevenue = await prisma_1.default.order.aggregate({
            where: { status: 'COMPLETED' },
            _sum: { totalPrice: true }
        });
        return {
            totalUsers,
            totalVendors,
            totalCustomers,
            totalOrders,
            totalRevenue: totalRevenue._sum.totalPrice || 0,
            pendingVendors,
            pendingCertifications,
            pendingRentalSpaces: 0,
            recentOrders,
            recentUsers
        };
    }
    static async getAllUsers(page = 1, limit = 10, role, status) {
        const skip = (page - 1) * limit;
        const where = { deletedAt: null };
        if (role)
            where.role = role;
        if (status)
            where.status = status;
        const [users, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    phoneNumber: true,
                    createdAt: true,
                    vendorProfile: {
                        select: {
                            farmName: true,
                            certificationStatus: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.user.count({ where })
        ]);
        return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    static async updateUserStatus(userId, status) {
        const user = await prisma_1.default.user.update({
            where: { id: userId },
            data: { status },
            select: { id: true, name: true, email: true, status: true }
        });
        await prisma_1.default.notification.create({
            data: {
                userId,
                title: 'Account Status Updated',
                message: `Your account has been ${status.toLowerCase()}`,
                type: 'SYSTEM'
            }
        });
        return user;
    }
    static async deleteUser(userId) {
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { deletedAt: new Date(), status: 'INACTIVE' }
        });
        return { message: 'User deleted successfully' };
    }
    static async getAllVendors(page = 1, limit = 10, status) {
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.certificationStatus = status;
        const [vendors, total] = await Promise.all([
            prisma_1.default.vendorProfile.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: { name: true, email: true, phoneNumber: true }
                    },
                    produce: true,
                    orders: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.vendorProfile.count({ where })
        ]);
        const vendorList = vendors.map(vendor => ({
            id: vendor.id,
            farmName: vendor.farmName,
            farmLocation: vendor.farmLocation,
            certificationStatus: vendor.certificationStatus,
            user: vendor.user,
            totalProducts: vendor.produce.length,
            totalOrders: vendor.orders.length,
            totalRevenue: vendor.orders
                .filter(o => o.status === 'COMPLETED')
                .reduce((sum, o) => sum + o.totalPrice, 0),
            createdAt: vendor.createdAt
        }));
        return { vendors: vendorList, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    static async verifyVendor(vendorId, status, rejectionReason) {
        const vendor = await prisma_1.default.vendorProfile.update({
            where: { id: vendorId },
            data: { certificationStatus: status },
            include: { user: true }
        });
        await prisma_1.default.notification.create({
            data: {
                userId: vendor.userId,
                title: status === 'APPROVED' ? 'Vendor Approved' : 'Vendor Rejected',
                message: status === 'APPROVED'
                    ? 'Your vendor account has been approved!'
                    : `Your vendor account was rejected. Reason: ${rejectionReason}`,
                type: 'SYSTEM'
            }
        });
        return vendor;
    }
    static async getAllCertifications(page = 1, limit = 10, status) {
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.verificationStatus = status;
        const [certifications, total] = await Promise.all([
            prisma_1.default.sustainabilityCert.findMany({
                where,
                skip,
                take: limit,
                include: {
                    vendor: {
                        include: {
                            user: { select: { name: true, email: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.sustainabilityCert.count({ where })
        ]);
        return { certifications, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    static async verifyCertification(certId, status, verificationNotes) {
        const cert = await prisma_1.default.sustainabilityCert.update({
            where: { id: certId },
            data: {
                verificationStatus: status,
                verifiedAt: new Date(),
            },
            include: { vendor: { include: { user: true } } }
        });
        if (status === 'APPROVED') {
            await prisma_1.default.vendorProfile.update({
                where: { id: cert.vendorId },
                data: { certificationStatus: 'APPROVED' }
            });
        }
        else if (status === 'REJECTED') {
            await prisma_1.default.vendorProfile.update({
                where: { id: cert.vendorId },
                data: { certificationStatus: 'REJECTED' }
            });
        }
        await prisma_1.default.notification.create({
            data: {
                userId: cert.vendor.userId,
                title: status === 'APPROVED' ? 'Certification Approved' : 'Certification Rejected',
                message: `Your sustainability certification has been ${status.toLowerCase()}`,
                type: 'CERTIFICATION'
            }
        });
        return cert;
    }
    static async getAllRentalSpaces(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [spaces, total] = await Promise.all([
            prisma_1.default.rentalSpace.findMany({
                skip,
                take: limit,
                include: {
                    vendor: {
                        include: { user: { select: { name: true, email: true } } }
                    },
                    bookings: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.rentalSpace.count()
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
                    email: space.vendor.user.email
                }
            },
            bookingsCount: space.bookings.length
        }));
        return { spaces: transformedSpaces, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    static async getAllOrders(page = 1, limit = 10, status) {
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        const [orders, total] = await Promise.all([
            prisma_1.default.order.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { name: true, email: true } },
                    produce: { select: { name: true } },
                    vendor: { select: { farmName: true } }
                },
                orderBy: { orderDate: 'desc' }
            }),
            prisma_1.default.order.count({ where })
        ]);
        return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map