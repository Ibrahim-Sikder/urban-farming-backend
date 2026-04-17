"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_1 = require("../../shared/middleware/auth");
const validation_middleware_1 = require("../../shared/middleware/validation.middleware");
const user_validation_1 = require("./user.validation");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/dashboard/stats', user_controller_1.UserController.getDashboardStats);
router.get('/orders', (0, validation_middleware_1.validate)(user_validation_1.userOrderQuerySchema), user_controller_1.UserController.getOrders);
router.get('/orders/:id', user_controller_1.UserController.getOrderById);
router.get('/rentals', (0, validation_middleware_1.validate)(user_validation_1.userRentalQuerySchema), user_controller_1.UserController.getRentals);
router.get('/rentals/:id', user_controller_1.UserController.getRentalById);
router.get('/plants', (0, validation_middleware_1.validate)(user_validation_1.userPlantQuerySchema), user_controller_1.UserController.getPlants);
router.get('/plants/:id', user_controller_1.UserController.getPlantById);
exports.userRoutes = router;
//# sourceMappingURL=user.route.js.map