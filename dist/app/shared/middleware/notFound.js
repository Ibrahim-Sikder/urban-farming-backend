"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = void 0;
const response_1 = require("../utils/response");
const notFound = (req, res) => {
    response_1.ResponseHandler.error(res, `Cannot find ${req.originalUrl} on this server`, 404);
};
exports.notFound = notFound;
//# sourceMappingURL=notFound.js.map