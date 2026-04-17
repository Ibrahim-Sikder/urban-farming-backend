// modules/marketplace/marketplace.routes.ts
import { Router } from 'express';
import { MarketplaceController } from './marketplace.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    createProduceSchema,
    updateProduceSchema,
    addToCartSchema,
    updateCartItemSchema,
    createOrderSchema,
    updateOrderStatusSchema,
    produceFiltersSchema,
} from './marketplace.validation';
import { authenticate, authorize } from '../../shared/middleware/auth';

const router = Router();

// ============ PUBLIC ROUTES ============
router.get('/produces', validate(produceFiltersSchema), MarketplaceController.getAllProduce);
router.get('/produces/:id', MarketplaceController.getProduceById);

// ============ PROTECTED ROUTES ============
router.use(authenticate);

// Cart Routes (Customer only)
router.get('/cart', authorize('CUSTOMER'), MarketplaceController.getCart);
router.post('/cart', authorize('CUSTOMER'), validate(addToCartSchema), MarketplaceController.addToCart);
router.put('/cart/:itemId', authorize('CUSTOMER'), validate(updateCartItemSchema), MarketplaceController.updateCartItem);
router.delete('/cart/:itemId', authorize('CUSTOMER'), MarketplaceController.removeFromCart);
router.delete('/cart', authorize('CUSTOMER'), MarketplaceController.clearCart);

// Order Routes
router.post('/orders', authorize('CUSTOMER'), validate(createOrderSchema), MarketplaceController.createOrder);
router.get('/orders', authorize('CUSTOMER', 'VENDOR'), MarketplaceController.getUserOrders);
router.get('/orders/:id', authorize('CUSTOMER', 'VENDOR'), MarketplaceController.getOrderById);
router.patch('/orders/:id/status', authorize('VENDOR'), validate(updateOrderStatusSchema), MarketplaceController.updateOrderStatus);

// Vendor Produce Management
router.post('/vendor/produces', authorize('VENDOR'), validate(createProduceSchema), MarketplaceController.createProduce);
router.get('/vendor/produces', authorize('VENDOR'), MarketplaceController.getVendorProduce);
router.put('/vendor/produces/:id', authorize('VENDOR'), validate(updateProduceSchema), MarketplaceController.updateProduce);
router.delete('/vendor/produces/:id', authorize('VENDOR'), MarketplaceController.deleteProduce);

export const marketplaceRoutes = router;