"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorController = void 0;
const vendor_service_1 = require("./vendor.service");
const response_1 = require("../../shared/utils/response");
class VendorController {
    static async getProfile(req, res) {
        try {
            const profile = await vendor_service_1.VendorService.getVendorProfile(req.user.id);
            response_1.ResponseHandler.success(res, profile, 'Vendor profile fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateProfile(req, res) {
        try {
            const result = await vendor_service_1.VendorService.updateVendorProfile(req.user.id, req.body);
            response_1.ResponseHandler.success(res, result, 'Profile updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async createProduce(req, res) {
        try {
            const produce = await vendor_service_1.VendorService.createProduce(req.user.id, req.body);
            response_1.ResponseHandler.success(res, produce, 'Product created successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getProduce(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await vendor_service_1.VendorService.getVendorProduce(req.user.id, page, limit);
            response_1.ResponseHandler.success(res, result, 'Products fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateProduce(req, res) {
        try {
            const produceId = parseInt(req.params.id);
            const result = await vendor_service_1.VendorService.updateProduce(req.user.id, produceId, req.body);
            response_1.ResponseHandler.success(res, result, 'Product updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deleteProduce(req, res) {
        try {
            const produceId = parseInt(req.params.id);
            const result = await vendor_service_1.VendorService.deleteProduce(req.user.id, produceId);
            response_1.ResponseHandler.success(res, result, 'Product deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async createRentalSpace(req, res) {
        try {
            const space = await vendor_service_1.VendorService.createRentalSpace(req.user.id, req.body);
            response_1.ResponseHandler.success(res, space, 'Rental space created successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getRentalSpaces(req, res) {
        try {
            const spaces = await vendor_service_1.VendorService.getVendorRentalSpaces(req.user.id);
            response_1.ResponseHandler.success(res, spaces, 'Rental spaces fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateRentalSpace(req, res) {
        try {
            const spaceId = parseInt(req.params.id);
            const result = await vendor_service_1.VendorService.updateRentalSpace(req.user.id, spaceId, req.body);
            response_1.ResponseHandler.success(res, result, 'Rental space updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deleteRentalSpace(req, res) {
        try {
            const spaceId = parseInt(req.params.id);
            const result = await vendor_service_1.VendorService.deleteRentalSpace(req.user.id, spaceId);
            response_1.ResponseHandler.success(res, result, 'Rental space deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async submitCertification(req, res) {
        try {
            const result = await vendor_service_1.VendorService.submitCertification(req.user.id, req.body);
            response_1.ResponseHandler.success(res, result, 'Certification submitted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getCertificationStatus(req, res) {
        try {
            const status = await vendor_service_1.VendorService.getCertificationStatus(req.user.id);
            response_1.ResponseHandler.success(res, status, 'Certification status fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getOrders(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const result = await vendor_service_1.VendorService.getVendorOrders(req.user.id, page, limit, status);
            response_1.ResponseHandler.success(res, result, 'Orders fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateOrderStatus(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const result = await vendor_service_1.VendorService.updateOrderStatus(req.user.id, orderId, req.body);
            response_1.ResponseHandler.success(res, result, 'Order status updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getBookings(req, res) {
        try {
            const bookings = await vendor_service_1.VendorService.getVendorBookings(req.user.id);
            response_1.ResponseHandler.success(res, bookings, 'Bookings fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getRevenueReport(req, res) {
        try {
            const report = await vendor_service_1.VendorService.getRevenueReport(req.user.id);
            response_1.ResponseHandler.success(res, report, 'Revenue report generated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.VendorController = VendorController;
//# sourceMappingURL=vendor.controller.js.map