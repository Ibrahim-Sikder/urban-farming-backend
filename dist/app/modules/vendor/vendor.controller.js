"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorController = void 0;
const vendor_service_1 = require("./vendor.service");
const response_1 = require("../../shared/utils/response");
class VendorController {
    static async getProfile(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const profile = await vendor_service_1.VendorService.getVendorProfile(req.user.id);
            response_1.ResponseHandler.success(res, profile, 'Vendor profile fetched successfully');
        }
        catch (error) {
            console.error('Get profile error:', error);
            if (error.message === 'Vendor profile not found') {
                response_1.ResponseHandler.error(res, 'Vendor profile not found', 404);
            }
            else {
                response_1.ResponseHandler.error(res, error.message || 'Failed to fetch vendor profile', 400);
            }
        }
    }
    static async updateProfile(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const updatedProfile = await vendor_service_1.VendorService.updateVendorProfile(req.user.id, req.body);
            response_1.ResponseHandler.success(res, updatedProfile, 'Profile updated successfully');
        }
        catch (error) {
            console.error('Update profile error:', error);
            if (error.message === 'Vendor profile not found') {
                response_1.ResponseHandler.error(res, 'Vendor profile not found', 404);
            }
            else {
                response_1.ResponseHandler.error(res, error.message || 'Failed to update vendor profile', 400);
            }
        }
    }
    static async createProduce(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const produce = await vendor_service_1.VendorService.createProduce(req.user.id, req.body);
            response_1.ResponseHandler.success(res, produce, 'Product created successfully', 201);
        }
        catch (error) {
            console.error('Create produce error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to create product', 400);
        }
    }
    static async getProduce(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                searchTerm: req.query.searchTerm,
                category: req.query.category,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
                certificationStatus: req.query.certificationStatus,
            };
            const result = await vendor_service_1.VendorService.getVendorProduce(req.user.id, queryParams);
            response_1.ResponseHandler.success(res, result, 'Products fetched successfully');
        }
        catch (error) {
            console.error('Get produce error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to fetch products', 400);
        }
    }
    static async updateProduce(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const produceId = parseInt(req.params.id);
            if (isNaN(produceId)) {
                response_1.ResponseHandler.error(res, 'Invalid product ID', 400);
                return;
            }
            const result = await vendor_service_1.VendorService.updateProduce(req.user.id, produceId, req.body);
            response_1.ResponseHandler.success(res, result, 'Product updated successfully');
        }
        catch (error) {
            console.error('Update produce error:', error);
            if (error.message === 'Produce not found or unauthorized') {
                response_1.ResponseHandler.error(res, 'Product not found', 404);
            }
            else {
                response_1.ResponseHandler.error(res, error.message || 'Failed to update product', 400);
            }
        }
    }
    static async deleteProduce(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const produceId = parseInt(req.params.id);
            if (isNaN(produceId)) {
                response_1.ResponseHandler.error(res, 'Invalid product ID', 400);
                return;
            }
            const result = await vendor_service_1.VendorService.deleteProduce(req.user.id, produceId);
            response_1.ResponseHandler.success(res, result, 'Product deleted successfully');
        }
        catch (error) {
            console.error('Delete produce error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to delete product', 400);
        }
    }
    static async createRentalSpace(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const space = await vendor_service_1.VendorService.createRentalSpace(req.user.id, req.body);
            response_1.ResponseHandler.success(res, space, 'Rental space created successfully', 201);
        }
        catch (error) {
            console.error('Create rental space error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to create rental space', 400);
        }
    }
    static async getRentalSpaces(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const spaces = await vendor_service_1.VendorService.getVendorRentalSpaces(req.user.id);
            response_1.ResponseHandler.success(res, spaces, 'Rental spaces fetched successfully');
        }
        catch (error) {
            console.error('Get rental spaces error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to fetch rental spaces', 400);
        }
    }
    static async updateRentalSpace(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const spaceId = parseInt(req.params.id);
            if (isNaN(spaceId)) {
                response_1.ResponseHandler.error(res, 'Invalid space ID', 400);
                return;
            }
            const result = await vendor_service_1.VendorService.updateRentalSpace(req.user.id, spaceId, req.body);
            response_1.ResponseHandler.success(res, result, 'Rental space updated successfully');
        }
        catch (error) {
            console.error('Update rental space error:', error);
            if (error.message === 'Rental space not found or unauthorized') {
                response_1.ResponseHandler.error(res, 'Rental space not found', 404);
            }
            else {
                response_1.ResponseHandler.error(res, error.message || 'Failed to update rental space', 400);
            }
        }
    }
    static async deleteRentalSpace(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const spaceId = parseInt(req.params.id);
            if (isNaN(spaceId)) {
                response_1.ResponseHandler.error(res, 'Invalid space ID', 400);
                return;
            }
            const result = await vendor_service_1.VendorService.deleteRentalSpace(req.user.id, spaceId);
            response_1.ResponseHandler.success(res, result, 'Rental space deleted successfully');
        }
        catch (error) {
            console.error('Delete rental space error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to delete rental space', 400);
        }
    }
    static async submitCertification(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const result = await vendor_service_1.VendorService.submitCertification(req.user.id, req.body);
            response_1.ResponseHandler.success(res, result, 'Certification submitted successfully');
        }
        catch (error) {
            console.error('Submit certification error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to submit certification', 400);
        }
    }
    static async getCertificationStatus(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const status = await vendor_service_1.VendorService.getCertificationStatus(req.user.id);
            response_1.ResponseHandler.success(res, status, 'Certification status fetched successfully');
        }
        catch (error) {
            console.error('Get certification error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to fetch certification status', 400);
        }
    }
    static async getOrders(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                status: req.query.status,
            };
            const result = await vendor_service_1.VendorService.getVendorOrders(req.user.id, queryParams);
            response_1.ResponseHandler.success(res, result, 'Orders fetched successfully');
        }
        catch (error) {
            console.error('Get orders error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to fetch orders', 400);
        }
    }
    static async updateOrderStatus(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const orderId = parseInt(req.params.id);
            if (isNaN(orderId)) {
                response_1.ResponseHandler.error(res, 'Invalid order ID', 400);
                return;
            }
            const result = await vendor_service_1.VendorService.updateOrderStatus(req.user.id, orderId, req.body);
            response_1.ResponseHandler.success(res, result, 'Order status updated successfully');
        }
        catch (error) {
            console.error('Update order error:', error);
            if (error.message === 'Order not found or unauthorized') {
                response_1.ResponseHandler.error(res, 'Order not found', 404);
            }
            else {
                response_1.ResponseHandler.error(res, error.message || 'Failed to update order status', 400);
            }
        }
    }
    static async getBookings(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const bookings = await vendor_service_1.VendorService.getVendorBookings(req.user.id);
            response_1.ResponseHandler.success(res, bookings, 'Bookings fetched successfully');
        }
        catch (error) {
            console.error('Get bookings error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to fetch bookings', 400);
        }
    }
    static async getRevenueReport(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const report = await vendor_service_1.VendorService.getRevenueReport(req.user.id);
            response_1.ResponseHandler.success(res, report, 'Revenue report generated successfully');
        }
        catch (error) {
            console.error('Get revenue report error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to generate revenue report', 400);
        }
    }
}
exports.VendorController = VendorController;
//# sourceMappingURL=vendor.controller.js.map