"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_1 = require("@/app/shared/middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/dashboard/stats', user_controller_1.UserController.getDashboardStats);
router.get('/orders', user_controller_1.UserController.getOrders);
router.get('/rentals', user_controller_1.UserController.getRentals);
router.get('/plants', user_controller_1.UserController.getPlants);
exports.default = router;
//# sourceMappingURL=user.route.js.map