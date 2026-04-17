"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Urban Farming Platform API',
            version: '1.0.0',
            description: `
        Interactive Urban Farming Platform API Documentation
        
        ## Features:
        - Garden Space Rental System
        - Produce Marketplace with Cart
        - Community Forum
        - Real-time Plant Tracking
        - Sustainability Certification
        - Role-based Access Control (Admin/Vendor/Customer)
      `,
            contact: {
                name: 'API Support',
                email: 'support@urbanfarming.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000/api/v1',
                description: 'Development Server',
            },
            {
                url: 'https://api.urbanfarming.com/api/v1',
                description: 'Production Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token',
                },
            },
            schemas: {
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operation successful' },
                        data: { type: 'object' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        error: { type: 'string' },
                    },
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'John Doe' },
                        email: { type: 'string', example: 'john@example.com' },
                        role: { type: 'string', enum: ['ADMIN', 'VENDOR', 'CUSTOMER'] },
                        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
                        phoneNumber: { type: 'string', example: '+8801712345678' },
                        address: { type: 'string', example: 'Dhaka, Bangladesh' },
                        profileImage: { type: 'string', example: 'https://...' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                RegisterInput: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                        name: { type: 'string', example: 'John Doe' },
                        email: { type: 'string', example: 'john@example.com' },
                        password: { type: 'string', format: 'password', example: 'Password@123' },
                        role: { type: 'string', enum: ['CUSTOMER', 'VENDOR'], default: 'CUSTOMER' },
                        phoneNumber: { type: 'string', example: '+8801712345678' },
                        address: { type: 'string', example: 'Dhaka, Bangladesh' },
                        farmName: { type: 'string', description: 'Required if role is VENDOR' },
                        farmLocation: { type: 'string', description: 'Required if role is VENDOR' },
                    },
                },
                LoginInput: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', example: 'john@example.com' },
                        password: { type: 'string', format: 'password', example: 'Password@123' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        expiresIn: { type: 'string', example: '15m' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                },
                VendorProfile: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        farmName: { type: 'string' },
                        certificationStatus: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
                        farmLocation: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Produce: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        vendorId: { type: 'integer' },
                        name: { type: 'string', example: 'Organic Tomato' },
                        description: { type: 'string', example: 'Fresh organic tomatoes' },
                        price: { type: 'number', format: 'float', example: 120.50 },
                        category: { type: 'string', example: 'Vegetables' },
                        certificationStatus: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
                        availableQuantity: { type: 'integer', example: 100 },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                CreateProduceInput: {
                    type: 'object',
                    required: ['name', 'description', 'price', 'category', 'availableQuantity'],
                    properties: {
                        name: { type: 'string', example: 'Organic Tomato' },
                        description: { type: 'string', example: 'Fresh organic tomatoes' },
                        price: { type: 'number', example: 120.50 },
                        category: { type: 'string', example: 'Vegetables' },
                        availableQuantity: { type: 'integer', example: 100 },
                    },
                },
                CartItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        quantity: { type: 'integer' },
                        produce: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                name: { type: 'string' },
                                price: { type: 'number' },
                                vendor: {
                                    type: 'object',
                                    properties: {
                                        farmName: { type: 'string' },
                                    },
                                },
                            },
                        },
                        subtotal: { type: 'number' },
                    },
                },
                CartResponse: {
                    type: 'object',
                    properties: {
                        items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
                        totalItems: { type: 'integer' },
                        totalPrice: { type: 'number' },
                    },
                },
                AddToCartInput: {
                    type: 'object',
                    required: ['produceId', 'quantity'],
                    properties: {
                        produceId: { type: 'integer', example: 1 },
                        quantity: { type: 'integer', example: 2, minimum: 1 },
                    },
                },
                Order: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        quantity: { type: 'integer' },
                        totalPrice: { type: 'number' },
                        status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] },
                        orderDate: { type: 'string', format: 'date-time' },
                        produce: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                name: { type: 'string' },
                                vendor: {
                                    type: 'object',
                                    properties: {
                                        farmName: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
                CreateOrderInput: {
                    type: 'object',
                    required: ['produceId', 'vendorId', 'quantity'],
                    properties: {
                        produceId: { type: 'integer', example: 1 },
                        vendorId: { type: 'integer', example: 1 },
                        quantity: { type: 'integer', example: 2, minimum: 1 },
                    },
                },
                RentalSpace: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        vendorId: { type: 'integer' },
                        location: { type: 'string' },
                        size: { type: 'number', description: 'Size in square feet' },
                        price: { type: 'number', description: 'Price per month' },
                        availability: { type: 'boolean' },
                        vendor: {
                            type: 'object',
                            properties: {
                                farmName: { type: 'string' },
                                user: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
                RentalBooking: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        startDate: { type: 'string', format: 'date' },
                        endDate: { type: 'string', format: 'date' },
                        status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] },
                        space: { $ref: '#/components/schemas/RentalSpace' },
                    },
                },
                CreateRentalBookingInput: {
                    type: 'object',
                    required: ['spaceId', 'startDate', 'endDate'],
                    properties: {
                        spaceId: { type: 'integer', example: 1 },
                        startDate: { type: 'string', format: 'date', example: '2024-01-01' },
                        endDate: { type: 'string', format: 'date', example: '2024-12-31' },
                    },
                },
                CommunityPost: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        postContent: { type: 'string' },
                        postDate: { type: 'string', format: 'date-time' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                name: { type: 'string' },
                                profileImage: { type: 'string' },
                            },
                        },
                        commentCount: { type: 'integer' },
                    },
                },
                CreatePostInput: {
                    type: 'object',
                    required: ['postContent'],
                    properties: {
                        postContent: { type: 'string', example: 'Tips for growing tomatoes in balcony...' },
                    },
                },
                Comment: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        content: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                name: { type: 'string' },
                                profileImage: { type: 'string' },
                            },
                        },
                    },
                },
                PlantTracking: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        plantName: { type: 'string' },
                        plantType: { type: 'string' },
                        plantedDate: { type: 'string', format: 'date' },
                        expectedHarvestDate: { type: 'string', format: 'date' },
                        healthStatus: { type: 'string', enum: ['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY'] },
                        growthStage: { type: 'string', enum: ['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING'] },
                        notes: { type: 'string' },
                    },
                },
                CreatePlantInput: {
                    type: 'object',
                    required: ['plantName', 'plantType', 'plantedDate', 'expectedHarvestDate'],
                    properties: {
                        plantName: { type: 'string', example: 'Tomato Plant' },
                        plantType: { type: 'string', example: 'Tomato' },
                        plantedDate: { type: 'string', format: 'date', example: '2024-01-01' },
                        expectedHarvestDate: { type: 'string', format: 'date', example: '2024-03-01' },
                        notes: { type: 'string' },
                    },
                },
                SustainabilityCert: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        vendorId: { type: 'integer' },
                        certifyingAgency: { type: 'string' },
                        certificationDate: { type: 'string', format: 'date' },
                        expiryDate: { type: 'string', format: 'date' },
                        documentUrl: { type: 'string' },
                        verificationStatus: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
                    },
                },
                SubmitCertInput: {
                    type: 'object',
                    required: ['certifyingAgency', 'certificationDate', 'documentUrl'],
                    properties: {
                        certifyingAgency: { type: 'string', example: 'USDA Organic' },
                        certificationDate: { type: 'string', format: 'date', example: '2024-01-01' },
                        expiryDate: { type: 'string', format: 'date', example: '2025-01-01' },
                        documentUrl: { type: 'string', example: 'https://...' },
                    },
                },
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        type: { type: 'string' },
                        isRead: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                DashboardStats: {
                    type: 'object',
                    properties: {
                        totalUsers: { type: 'integer' },
                        totalVendors: { type: 'integer' },
                        totalCustomers: { type: 'integer' },
                        totalOrders: { type: 'integer' },
                        totalRevenue: { type: 'number' },
                        pendingVendors: { type: 'integer' },
                        pendingCertifications: { type: 'integer' },
                        recentOrders: { type: 'array' },
                        recentUsers: { type: 'array' },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Authentication', description: 'Auth endpoints' },
            { name: 'Admin', description: 'Admin only endpoints' },
            { name: 'Marketplace', description: 'Product and order management' },
            { name: 'Cart', description: 'Shopping cart operations' },
            { name: 'Rental', description: 'Garden space rental' },
            { name: 'Community', description: 'Forum posts and comments' },
            { name: 'Plant Tracking', description: 'Track your plants' },
            { name: 'Vendor', description: 'Vendor management' },
            { name: 'Notifications', description: 'User notifications' },
        ],
    },
    apis: ['./src/modules/**/*.ts'],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
//# sourceMappingURL=swagger.js.map