"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_route_1 = require("../modules/auth/auth.route");
const user_route_1 = require("../modules/user/user.route");
const community_routes_1 = require("../modules/community/community.routes");
const vendor_routes_1 = require("../modules/vendor/vendor.routes");
const plant_routes_1 = require("../modules/plant/plant.routes");
const rental_routes_1 = require("../modules/rental/rental.routes");
const marketplace_routes_1 = require("../modules/marketplace/marketplace.routes");
const router = (0, express_1.Router)();
const moduleRoutes = [
    { path: '/auth', route: auth_route_1.authRoutes },
    { path: '/users', route: user_route_1.userRoutes },
    { path: '/community', route: community_routes_1.communityRoutes },
    { path: '/vendors', route: vendor_routes_1.vendorRoutes },
    { path: '/rental', route: rental_routes_1.rentalRoutes },
    { path: '/plants', route: plant_routes_1.plantRoutes },
    { path: '/marketplace', route: marketplace_routes_1.marketplaceRoutes },
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