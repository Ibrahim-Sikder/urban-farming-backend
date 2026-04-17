"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSetup = exports.swaggerServe = exports.swaggerUiOptions = void 0;
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
exports.swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Urban Farming Platform API Docs',
    swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
    },
};
exports.swaggerServe = swagger_ui_express_1.default.serve;
exports.swaggerSetup = swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, exports.swaggerUiOptions);
//# sourceMappingURL=swaggerUI.js.map