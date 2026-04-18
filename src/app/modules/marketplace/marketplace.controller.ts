import { Request, Response } from 'express';
import { MarketplaceService } from './marketplace.service';
import { ResponseHandler } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class MarketplaceController {

    static async createProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            const produce = await MarketplaceService.createProduce(req.user!.id, req.body);
            ResponseHandler.success(res, produce, 'Product created successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            const produceId = parseInt(req.params.id);
            const produce = await MarketplaceService.updateProduce(req.user!.id, produceId, req.body);
            ResponseHandler.success(res, produce, 'Product updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getAllProduce(req: Request, res: Response): Promise<void> {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
                category: req.query.category as string,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
                vendorId: req.query.vendorId ? parseInt(req.query.vendorId as string) : undefined,
                inStock: req.query.inStock === 'true',
            };
            const result = await MarketplaceService.getAllProduce(filters);
            ResponseHandler.success(res, result, 'Products fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getProduceById(req: Request, res: Response): Promise<void> {
        try {
            const produceId = parseInt(req.params.id);
            const produce = await MarketplaceService.getProduceById(produceId);
            ResponseHandler.success(res, produce, 'Product fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 404);
        }
    }

    static async getVendorProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
                category: req.query.category as string,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
            };
            const result = await MarketplaceService.getVendorProduce(req.user!.id, filters);
            ResponseHandler.success(res, result, 'Vendor products fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deleteProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            const produceId = parseInt(req.params.id);
            const result = await MarketplaceService.deleteProduce(req.user!.id, produceId);
            ResponseHandler.success(res, result, 'Product deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getCart(req: AuthRequest, res: Response): Promise<void> {
        try {
            const cart = await MarketplaceService.getCart(req.user!.id);
            ResponseHandler.success(res, cart, 'Cart fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async addToCart(req: AuthRequest, res: Response): Promise<void> {
        try {
            const cart = await MarketplaceService.addToCart(req.user!.id, req.body);
            ResponseHandler.success(res, cart, 'Item added to cart successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateCartItem(req: AuthRequest, res: Response): Promise<void> {
        try {
            const itemId = parseInt(req.params.itemId);
            const cart = await MarketplaceService.updateCartItem(req.user!.id, itemId, req.body.quantity);
            ResponseHandler.success(res, cart, 'Cart updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async removeFromCart(req: AuthRequest, res: Response): Promise<void> {
        try {
            const itemId = parseInt(req.params.itemId);
            const cart = await MarketplaceService.removeFromCart(req.user!.id, itemId);
            ResponseHandler.success(res, cart, 'Item removed from cart successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async clearCart(req: AuthRequest, res: Response): Promise<void> {
        try {
            const cart = await MarketplaceService.clearCart(req.user!.id);
            ResponseHandler.success(res, cart, 'Cart cleared successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async createOrder(req: AuthRequest, res: Response): Promise<void> {
        try {
            const order = await MarketplaceService.createOrder(req.user!.id, req.body);
            ResponseHandler.success(res, order, 'Order created successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getUserOrders(req: AuthRequest, res: Response): Promise<void> {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                status: req.query.status as any,
            };
            const orders = await MarketplaceService.getUserOrders(req.user!.id, filters);
            ResponseHandler.success(res, orders, 'Orders fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getOrderById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orderId = parseInt(req.params.id);
            const order = await MarketplaceService.getOrderById(req.user!.id, orderId);
            ResponseHandler.success(res, order, 'Order fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 404);
        }
    }

    static async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orderId = parseInt(req.params.id);
            const order = await MarketplaceService.updateOrderStatus(req.user!.id, orderId, req.body);
            ResponseHandler.success(res, order, 'Order status updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}