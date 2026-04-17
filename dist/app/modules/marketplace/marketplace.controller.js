"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceController = void 0;
const marketplace_service_1 = require("./marketplace.service");
const response_1 = require("../../shared/utils/response");
class MarketplaceController {
    static async createProduce(req, res) {
        try {
            const produce = await marketplace_service_1.MarketplaceService.createProduce(req.user.id, req.body);
            response_1.ResponseHandler.success(res, produce, 'Product created successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateProduce(req, res) {
        try {
            const produceId = parseInt(req.params.id);
            const produce = await marketplace_service_1.MarketplaceService.updateProduce(req.user.id, produceId, req.body);
            response_1.ResponseHandler.success(res, produce, 'Product updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllProduce(req, res) {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                category: req.query.category,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
                search: req.query.search,
                vendorId: req.query.vendorId ? parseInt(req.query.vendorId) : undefined,
            };
            const result = await marketplace_service_1.MarketplaceService.getAllProduce(filters);
            response_1.ResponseHandler.success(res, result, 'Products fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getProduceById(req, res) {
        try {
            const produceId = parseInt(req.params.id);
            const produce = await marketplace_service_1.MarketplaceService.getProduceById(produceId);
            response_1.ResponseHandler.success(res, produce, 'Product fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 404);
        }
    }
    static async getVendorProduce(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await marketplace_service_1.MarketplaceService.getVendorProduce(req.user.id, page, limit);
            response_1.ResponseHandler.success(res, result, 'Vendor products fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deleteProduce(req, res) {
        try {
            const produceId = parseInt(req.params.id);
            const result = await marketplace_service_1.MarketplaceService.deleteProduce(req.user.id, produceId);
            response_1.ResponseHandler.success(res, result, 'Product deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getCart(req, res) {
        try {
            const cart = await marketplace_service_1.MarketplaceService.getCart(req.user.id);
            response_1.ResponseHandler.success(res, cart, 'Cart fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async addToCart(req, res) {
        try {
            const cart = await marketplace_service_1.MarketplaceService.addToCart(req.user.id, req.body);
            response_1.ResponseHandler.success(res, cart, 'Item added to cart successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateCartItem(req, res) {
        try {
            const itemId = parseInt(req.params.itemId);
            const cart = await marketplace_service_1.MarketplaceService.updateCartItem(req.user.id, itemId, req.body.quantity);
            response_1.ResponseHandler.success(res, cart, 'Cart updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async removeFromCart(req, res) {
        try {
            const itemId = parseInt(req.params.itemId);
            const cart = await marketplace_service_1.MarketplaceService.removeFromCart(req.user.id, itemId);
            response_1.ResponseHandler.success(res, cart, 'Item removed from cart successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async clearCart(req, res) {
        try {
            const cart = await marketplace_service_1.MarketplaceService.clearCart(req.user.id);
            response_1.ResponseHandler.success(res, cart, 'Cart cleared successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async createOrder(req, res) {
        try {
            const order = await marketplace_service_1.MarketplaceService.createOrder(req.user.id, req.body);
            response_1.ResponseHandler.success(res, order, 'Order created successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getUserOrders(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const orders = await marketplace_service_1.MarketplaceService.getUserOrders(req.user.id, page, limit);
            response_1.ResponseHandler.success(res, orders, 'Orders fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getOrderById(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const order = await marketplace_service_1.MarketplaceService.getOrderById(req.user.id, orderId);
            response_1.ResponseHandler.success(res, order, 'Order fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 404);
        }
    }
    static async updateOrderStatus(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const order = await marketplace_service_1.MarketplaceService.updateOrderStatus(req.user.id, orderId, req.body);
            response_1.ResponseHandler.success(res, order, 'Order status updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.MarketplaceController = MarketplaceController;
//# sourceMappingURL=marketplace.controller.js.map