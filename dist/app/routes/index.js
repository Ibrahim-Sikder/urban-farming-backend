"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_route_1 = require("../modules/auth/auth.route");
const router = (0, express_1.Router)();
const moduleRoutes = [
    { path: '/auth', route: auth_route_1.authRoutes },
];
moduleRoutes.forEach((route) => {
    router.use(route.path, route.route);
});
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map