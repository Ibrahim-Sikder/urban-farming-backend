import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',  // ← nodeEnv (ছোট h)
    databaseUrl: process.env.DATABASE_URL!,

    jwt: {
        secret: process.env.JWT_SECRET!,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    },
};

// Validation
if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is required in .env file');
}

if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required in .env file');
}

console.log('✅ Config loaded successfully');
console.log(`📦 Environment: ${config.nodeEnv}`);