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

    private static readonly VALID_COLUMNS: Record<string, Record<string, string>> = {
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
        const validColumns = PrismaQueryBuilder.VALID_COLUMNS[this.modelName] || {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder', 'searchTerm', 'fields'];

        Object.keys(this.query).forEach(key => {
            if (!excludeKeys.includes(key) && this.query[key] !== undefined && this.query[key] !== '' && validColumns[key]) {
                this.filters[key] = this.query[key];
            }
        });
    }

    private buildWhereClause(): Prisma.Sql {
        const conditions: Prisma.Sql[] = [];

        if (this.customConditions.length > 0) {
            conditions.push(...this.customConditions);
        }
        if (this.searchTerm && this.searchFields.length > 0) {
            const searchConditions = this.searchFields.map(field => {
                return Prisma.sql`${Prisma.raw(field)}::text ILIKE ${`%${this.searchTerm}%`}`;
            });
            conditions.push(Prisma.sql`(${Prisma.join(searchConditions, ' OR ')})`);
        }
        const validColumns = PrismaQueryBuilder.VALID_COLUMNS[this.modelName] || {};

        Object.entries(this.filters).forEach(([key, value]) => {
            const dbField = validColumns[key];
            if (dbField && value !== undefined && value !== null && value !== '') {
                if (typeof value === 'string' && value.includes(',')) {
                    const values = value.split(',').map(v => `'${v.trim()}'`).join(',');
                    conditions.push(Prisma.sql`${Prisma.raw(dbField)} IN (${Prisma.raw(values)})`);
                } else {
                    conditions.push(Prisma.sql`${Prisma.raw(dbField)} = ${value}`);
                }
            }
        });

        if (conditions.length === 0) {
            return Prisma.sql`1=1`;
        }

        return Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
    }

    private buildOrderByClause(): string {
        const direction = this.sortOrderValue === 'asc' ? 'ASC' : 'DESC';
        const validSortFields = ['createdAt', 'updatedAt', 'plantName', 'healthStatus', 'growthStage', 'expectedHarvestDate'];
        const field = validSortFields.includes(this.sortByField) ? this.sortByField : 'createdAt';
        return `ORDER BY "${field}" ${direction}`;
    }

    setSearchFields(fields: string[]): this {
        this.searchFields = fields;
        return this;
    }

    addCustomCondition(condition: Prisma.Sql): this {
        this.customConditions.push(condition);
        return this;
    }

    clearCustomConditions(): this {
        this.customConditions = [];
        return this;
    }

    async execute<T = any>(customQuery?: Prisma.Sql): Promise<PaginatedResult<T>> {
        const whereClause = this.buildWhereClause();
        const orderByClause = this.buildOrderByClause();
        const countQuery = Prisma.sql`
            SELECT COUNT(1) as total
            FROM ${Prisma.raw(`"${this.modelName}"`)}
            WHERE ${whereClause}
        `;

        let dataQuery: Prisma.Sql;

        if (customQuery) {
            const queryStr = customQuery.sql;
            const hasWhere = queryStr.toUpperCase().includes('WHERE');

            if (hasWhere && whereClause.sql !== '1=1') {
                dataQuery = Prisma.sql`
                    ${customQuery}
                    AND ${whereClause}
                    ${Prisma.raw(orderByClause)}
                    LIMIT ${this.limit}
                    OFFSET ${this.offset}
                `;
            } else if (whereClause.sql !== '1=1') {
                dataQuery = Prisma.sql`
                    ${customQuery}
                    WHERE ${whereClause}
                    ${Prisma.raw(orderByClause)}
                    LIMIT ${this.limit}
                    OFFSET ${this.offset}
                `;
            } else {
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

    async getPaginationMeta(): Promise<PaginatedResult<any>['meta']> {
        const whereClause = this.buildWhereClause();
        const countQuery = Prisma.sql`
            SELECT COUNT(1) as total
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