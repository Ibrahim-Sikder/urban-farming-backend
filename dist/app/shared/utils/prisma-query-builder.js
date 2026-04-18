"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaQueryBuilder = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
class PrismaQueryBuilder {
    modelName;
    query;
    limit = 10;
    offset = 0;
    page = 1;
    searchTerm = '';
    searchFields = [];
    filters = {};
    sortByField = 'createdAt';
    sortOrderValue = 'desc';
    customConditions = [];
    static VALID_COLUMNS = {
        'PlantTracking': {
            'healthStatus': 'healthStatus',
            'growthStage': 'growthStage',
            'plantType': 'plantType',
            'userId': 'userId',
            'id': 'id'
        },
        'User': {
            'role': 'role',
            'status': 'status'
        },
        'Produce': {
            'category': 'category',
            'vendorId': 'vendorId',
            'certificationStatus': 'certificationStatus'
        }
    };
    constructor(modelName, query) {
        this.modelName = modelName;
        this.query = query;
        this.init();
    }
    init() {
        this.page = Math.max(1, Number(this.query.page) || 1);
        this.limit = Math.min(100, Math.max(1, Number(this.query.limit) || 10));
        this.offset = (this.page - 1) * this.limit;
        this.searchTerm = this.query.searchTerm || '';
        this.sortByField = this.query.sortBy || 'createdAt';
        this.sortOrderValue = this.query.sortOrder || 'desc';
        const validColumns = PrismaQueryBuilder.VALID_COLUMNS[this.modelName] || {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder', 'searchTerm', 'fields'];
        Object.keys(this.query).forEach(key => {
            if (!excludeKeys.includes(key) && this.query[key] !== undefined && this.query[key] !== '' && validColumns[key]) {
                this.filters[key] = this.query[key];
            }
        });
    }
    buildWhereClause() {
        const conditions = [];
        if (this.customConditions.length > 0) {
            conditions.push(...this.customConditions);
        }
        if (this.searchTerm && this.searchFields.length > 0) {
            const searchConditions = this.searchFields.map(field => {
                return client_1.Prisma.sql `${client_1.Prisma.raw(field)}::text ILIKE ${`%${this.searchTerm}%`}`;
            });
            conditions.push(client_1.Prisma.sql `(${client_1.Prisma.join(searchConditions, ' OR ')})`);
        }
        const validColumns = PrismaQueryBuilder.VALID_COLUMNS[this.modelName] || {};
        Object.entries(this.filters).forEach(([key, value]) => {
            const dbField = validColumns[key];
            if (dbField && value !== undefined && value !== null && value !== '') {
                if (typeof value === 'string' && value.includes(',')) {
                    const values = value.split(',').map(v => `'${v.trim()}'`).join(',');
                    conditions.push(client_1.Prisma.sql `${client_1.Prisma.raw(dbField)} IN (${client_1.Prisma.raw(values)})`);
                }
                else {
                    conditions.push(client_1.Prisma.sql `${client_1.Prisma.raw(dbField)} = ${value}`);
                }
            }
        });
        if (conditions.length === 0) {
            return client_1.Prisma.sql `1=1`;
        }
        return client_1.Prisma.sql `${client_1.Prisma.join(conditions, ' AND ')}`;
    }
    buildOrderByClause() {
        const direction = this.sortOrderValue === 'asc' ? 'ASC' : 'DESC';
        const validSortFields = ['createdAt', 'updatedAt', 'plantName', 'healthStatus', 'growthStage', 'expectedHarvestDate'];
        const field = validSortFields.includes(this.sortByField) ? this.sortByField : 'createdAt';
        return `ORDER BY "${field}" ${direction}`;
    }
    setSearchFields(fields) {
        this.searchFields = fields;
        return this;
    }
    addCustomCondition(condition) {
        this.customConditions.push(condition);
        return this;
    }
    clearCustomConditions() {
        this.customConditions = [];
        return this;
    }
    async execute(customQuery) {
        const whereClause = this.buildWhereClause();
        const orderByClause = this.buildOrderByClause();
        const countQuery = client_1.Prisma.sql `
            SELECT COUNT(1) as total
            FROM ${client_1.Prisma.raw(`"${this.modelName}"`)}
            WHERE ${whereClause}
        `;
        let dataQuery;
        if (customQuery) {
            const queryStr = customQuery.sql;
            const hasWhere = queryStr.toUpperCase().includes('WHERE');
            if (hasWhere && whereClause.sql !== '1=1') {
                dataQuery = client_1.Prisma.sql `
                    ${customQuery}
                    AND ${whereClause}
                    ${client_1.Prisma.raw(orderByClause)}
                    LIMIT ${this.limit}
                    OFFSET ${this.offset}
                `;
            }
            else if (whereClause.sql !== '1=1') {
                dataQuery = client_1.Prisma.sql `
                    ${customQuery}
                    WHERE ${whereClause}
                    ${client_1.Prisma.raw(orderByClause)}
                    LIMIT ${this.limit}
                    OFFSET ${this.offset}
                `;
            }
            else {
                dataQuery = client_1.Prisma.sql `
                    ${customQuery}
                    ${client_1.Prisma.raw(orderByClause)}
                    LIMIT ${this.limit}
                    OFFSET ${this.offset}
                `;
            }
        }
        else {
            dataQuery = client_1.Prisma.sql `
                SELECT *
                FROM ${client_1.Prisma.raw(`"${this.modelName}"`)}
                WHERE ${whereClause}
                ${client_1.Prisma.raw(orderByClause)}
                LIMIT ${this.limit}
                OFFSET ${this.offset}
            `;
        }
        const [countResult, data] = await Promise.all([
            prisma_1.default.$queryRaw(countQuery),
            prisma_1.default.$queryRaw(dataQuery)
        ]);
        const total = Number(countResult[0]?.total) || 0;
        const totalPages = Math.ceil(total / this.limit);
        return {
            data,
            meta: {
                page: this.page,
                limit: this.limit,
                total,
                totalPages,
                hasNextPage: this.page < totalPages,
                hasPrevPage: this.page > 1,
            }
        };
    }
    async getPaginationMeta() {
        const whereClause = this.buildWhereClause();
        const countQuery = client_1.Prisma.sql `
            SELECT COUNT(1) as total
            FROM ${client_1.Prisma.raw(`"${this.modelName}"`)}
            WHERE ${whereClause}
        `;
        const countResult = await prisma_1.default.$queryRaw(countQuery);
        const total = Number(countResult[0]?.total) || 0;
        const totalPages = Math.ceil(total / this.limit);
        return {
            page: this.page,
            limit: this.limit,
            total,
            totalPages,
            hasNextPage: this.page < totalPages,
            hasPrevPage: this.page > 1,
        };
    }
}
exports.PrismaQueryBuilder = PrismaQueryBuilder;
//# sourceMappingURL=prisma-query-builder.js.map