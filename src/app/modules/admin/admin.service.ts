// modules/admin/admin.service.ts
import { CertificationStatus, UserStatus } from '@prisma/client';
import prisma from '../../config/prisma';
import {
    DashboardFilters,
    DashboardStatsResponse
} from './admin.type';

export class AdminService {

    // ============ DASHBOARD STATISTICS ============
    static async getDashboardStats(filters?: DashboardFilters): Promise<DashboardStatsResponse> {
        const whereDate: any = {};
        if (filters?.startDate) whereDate.gte = filters.startDate;
        if (filters?.endDate) whereDate.lte = filters.endDate;

        const [
            totalUsers,
            totalVendors,
            totalCustomers,
            totalOrders,
            pendingVendors,
            pendingCertifications,
            totalRentalSpaces,
            recentOrders,
            recentUsers
        ] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.vendorProfile.count(),
            prisma.user.count({ where: { role: 'CUSTOMER', deletedAt: null } }),
            prisma.order.count(),
            prisma.vendorProfile.count({ where: { certificationStatus: 'PENDING' } }),
            prisma.sustainabilityCert.count({ where: { verificationStatus: 'PENDING' } }),
            prisma.rentalSpace.count(),
            prisma.order.findMany({
                take: 10,
                orderBy: { orderDate: 'desc' },
                include: {
                    user: { select: { name: true, email: true } }
                }
            }),
            prisma.user.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                where: { deletedAt: null },
                select: { id: true, name: true, email: true, role: true, createdAt: true }
            })
        ]);

        const totalRevenue = await prisma.order.aggregate({
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
            pendingRentalSpaces: 0, // Your schema doesn't have approval system for rental spaces
            recentOrders,
            recentUsers
        };
    }

    // ============ USER MANAGEMENT ============
    static async getAllUsers(page: number = 1, limit: number = 10, role?: string, status?: string) {
        const skip = (page - 1) * limit;
        const where: any = { deletedAt: null };
        if (role) where.role = role;
        if (status) where.status = status;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
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
            prisma.user.count({ where })
        ]);

        return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    static async updateUserStatus(userId: number, status: UserStatus) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { status },
            select: { id: true, name: true, email: true, status: true }
        });

        await prisma.notification.create({
            data: {
                userId,
                title: 'Account Status Updated',
                message: `Your account has been ${status.toLowerCase()}`,
                type: 'SYSTEM'
            }
        });

        return user;
    }

    static async deleteUser(userId: number) {
        await prisma.user.update({
            where: { id: userId },
            data: { deletedAt: new Date(), status: 'INACTIVE' }
        });

        return { message: 'User deleted successfully' };
    }

    // ============ VENDOR MANAGEMENT ============
    static async getAllVendors(page: number = 1, limit: number = 10, status?: string) {
        const skip = (page - 1) * limit;
        const where: any = {};
        if (status) where.certificationStatus = status;

        const [vendors, total] = await Promise.all([
            prisma.vendorProfile.findMany({
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
            prisma.vendorProfile.count({ where })
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

    static async verifyVendor(vendorId: number, status: CertificationStatus, rejectionReason?: string) {
        const vendor = await prisma.vendorProfile.update({
            where: { id: vendorId },
            data: { certificationStatus: status },
            include: { user: true }
        });

        await prisma.notification.create({
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

    // ============ CERTIFICATION MANAGEMENT ============
    static async getAllCertifications(page: number = 1, limit: number = 10, status?: string) {
        const skip = (page - 1) * limit;
        const where: any = {};
        if (status) where.verificationStatus = status;

        const [certifications, total] = await Promise.all([
            prisma.sustainabilityCert.findMany({
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
            prisma.sustainabilityCert.count({ where })
        ]);

        return { certifications, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    static async verifyCertification(certId: number, status: CertificationStatus, verificationNotes?: string) {
        const cert = await prisma.sustainabilityCert.update({
            where: { id: certId },
            data: {
                verificationStatus: status,
                verifiedAt: new Date(),
                verificationNotes: verificationNotes || null
            },
            include: { vendor: { include: { user: true } } }
        });

        // Update vendor certification status
        if (status === 'APPROVED') {
            await prisma.vendorProfile.update({
                where: { id: cert.vendorId },
                data: { certificationStatus: 'APPROVED' }
            });
        } else if (status === 'REJECTED') {
            await prisma.vendorProfile.update({
                where: { id: cert.vendorId },
                data: { certificationStatus: 'REJECTED' }
            });
        }

        await prisma.notification.create({
            data: {
                userId: cert.vendor.userId,
                title: status === 'APPROVED' ? 'Certification Approved' : 'Certification Rejected',
                message: `Your sustainability certification has been ${status.toLowerCase()}`,
                type: 'CERTIFICATION'
            }
        });

        return cert;
    }

    // ============ RENTAL SPACE MANAGEMENT ============
    // Note: Your schema doesn't have isApproved field, so vendors can directly list spaces
    static async getAllRentalSpaces(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [spaces, total] = await Promise.all([
            prisma.rentalSpace.findMany({
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
            prisma.rentalSpace.count()
        ]);

        // Transform spaces to include vendor info
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

    // Note: Since no isApproved field, this method is removed
    // static async approveRentalSpace(spaceId: number, isApproved: boolean, rejectionReason?: string) {
    //     // This feature is not available in your schema
    // }

    // ============ ORDER MANAGEMENT ============
    static async getAllOrders(page: number = 1, limit: number = 10, status?: string) {
        const skip = (page - 1) * limit;
        const where: any = {};
        if (status) where.status = status;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
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
            prisma.order.count({ where })
        ]);

        return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}