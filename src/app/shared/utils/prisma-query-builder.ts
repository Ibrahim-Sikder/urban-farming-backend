import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';

export interface QueryBuilderOptions {
    searchTerm?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, any>;
    searchFields?: string[];
}

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export class PrismaQueryBuilder<T = any> {
    private modelName: string;
    private query: Record<string, any>;
    private limit: number = 10;
    private offset: number = 0;
    private page: number = 1;
    private searchTerm: string = '';
    private searchFields: string[] = [];
    private filters: Record<string, any> = {};
    private sortByField: string = 'createdAt';
    private sortOrderValue: 'asc' | 'desc' = 'desc';
    private customConditions: Prisma.Sql[] = [];

    constructor(modelName: string, query: Record<string, any>) {
        this.modelName = modelName;
        this.query = query;
        this.init();
    }

    private init() {
        this.page = Math.max(1, Number(this.query.page) || 1);
        this.limit = Math.min(100, Math.max(1, Number(this.query.limit) || 10));
        this.offset = (this.page - 1) * this.limit;
        this.searchTerm = (this.query.searchTerm as string) || '';
        this.sortByField = (this.query.sortBy as string) || 'createdAt';
        this.sortOrderValue = (this.query.sortOrder as 'asc' | 'desc') || 'desc';

        // Extract filters (exclude special query params)
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder', 'searchTerm', 'fields', 'inStock'];
        Object.keys(this.query).forEach(key => {
            if (!excludeKeys.includes(key) && this.query[key] !== undefined && this.query[key] !== '') {
                this.filters[key] = this.query[key];
            }
        });
    }

    // Build WHERE clause with search and filters
    private buildWhereClause(): Prisma.Sql {
        const conditions: Prisma.Sql[] = [];

        // Add custom conditions from user
        if (this.customConditions.length > 0) {
            conditions.push(...this.customConditions);
        }

        // Add search conditions
        if (this.searchTerm && this.searchFields.length > 0) {
            const searchConditions = this.searchFields.map(field => {
                return Prisma.sql`${Prisma.raw(field)}::text ILIKE ${`%${this.searchTerm}%`}`;
            });
            conditions.push(Prisma.sql`(${Prisma.join(searchConditions, ' OR ')})`);
        }

        // Add filter conditions - skip invalid column names
        const validColumns = ['category', 'vendorId', 'certificationStatus', 'status', 'userId', 'role'];
        Object.entries(this.filters).forEach(([key, value]) => {
            // Only add filter if column exists in database
            if (validColumns.includes(key) && value !== undefined && value !== null && value !== '') {
                if (typeof value === 'string' && value.includes(',')) {
                    const values = value.split(',').map((v: string) => `'${v.trim()}'`).join(',');
                    conditions.push(Prisma.sql`${Prisma.raw(key)} IN (${Prisma.raw(values)})`);
                } else {
                    conditions.push(Prisma.sql`${Prisma.raw(key)} = ${value}`);
                }
            }
        });

        if (conditions.length === 0) {
            return Prisma.sql`1=1`;
        }

        return Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
    }

    // Build ORDER BY clause
    private buildOrderByClause(): string {
        const direction = this.sortOrderValue === 'asc' ? 'ASC' : 'DESC';

        const sortFieldMap: Record<string, string> = {
            'createdAt': 'createdAt',
            'updatedAt': 'updatedAt',
            'name': 'name',
            'price': 'price',
            'status': 'status',
            'plantName': 'plantName',
            'plantType': 'plantType',
            'healthStatus': 'healthStatus',
            'growthStage': 'growthStage',
            'orderDate': 'orderDate',
            'totalPrice': 'totalPrice',
        };

        const field = sortFieldMap[this.sortByField] || 'createdAt';
        return `ORDER BY "${field}" ${direction}`;
    }

    // Set searchable fields
    setSearchFields(fields: string[]): this {
        this.searchFields = fields;
        return this;
    }

    // Add custom condition (public method)
    addCustomCondition(condition: Prisma.Sql): this {
        this.customConditions.push(condition);
        return this;
    }

    // Clear all custom conditions
    clearCustomConditions(): this {
        this.customConditions = [];
        return this;
    }

    // Execute query and get paginated results
    async execute<T = any>(customQuery?: Prisma.Sql): Promise<PaginatedResult<T>> {
        const whereClause = this.buildWhereClause();
        const orderByClause = this.buildOrderByClause();

        // Build count query
        const countQuery = Prisma.sql`
            SELECT COUNT(*) as total
            FROM ${Prisma.raw(`"${this.modelName}"`)}
            WHERE ${whereClause}
        `;

        // Build data query
        let dataQuery: Prisma.Sql;

        if (customQuery) {
            // For custom query, we need to ensure WHERE clause is applied
            // Check if custom query already has WHERE clause
            const queryStr = customQuery.sql;
            if (queryStr.includes('WHERE') && whereClause.sql !== '1=1') {
                // Custom query has its own WHERE, append our conditions
                dataQuery = Prisma.sql`
                    ${customQuery}
                    AND ${whereClause}
                    ${Prisma.raw(orderByClause)}
                    LIMIT ${this.limit}
                    OFFSET ${this.offset}
                `;
            } else if (whereClause.sql !== '1=1') {
                // Custom query has no WHERE, add our conditions
                dataQuery = Prisma.sql`
                    ${customQuery}
                    WHERE ${whereClause}
                    ${Prisma.raw(orderByClause)}
                    LIMIT ${this.limit}
                    OFFSET ${this.offset}
                `;
            } else {
                // No conditions
                dataQuery = Prisma.sql`
                    ${customQuery}
                    ${Prisma.raw(orderByClause)}
                    LIMIT ${this.limit}
                    OFFSET ${this.offset}
                `;
            }
        } else {
            dataQuery = Prisma.sql`
                SELECT *
                FROM ${Prisma.raw(`"${this.modelName}"`)}
                WHERE ${whereClause}
                ${Prisma.raw(orderByClause)}
                LIMIT ${this.limit}
                OFFSET ${this.offset}
            `;
        }

        // Execute both queries
        const [countResult, data] = await Promise.all([
            prisma.$queryRaw<{ total: number }[]>(countQuery),
            prisma.$queryRaw<T[]>(dataQuery)
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

    // Get pagination metadata only (for headers)
    async getPaginationMeta(): Promise<PaginatedResult<any>['meta']> {
        const whereClause = this.buildWhereClause();
        const countQuery = Prisma.sql`
            SELECT COUNT(*) as total
            FROM ${Prisma.raw(`"${this.modelName}"`)}
            WHERE ${whereClause}
        `;

        const countResult = await prisma.$queryRaw<{ total: number }[]>(countQuery);
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