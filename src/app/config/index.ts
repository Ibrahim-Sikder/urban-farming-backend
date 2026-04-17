import dotenv from 'dotenv';
import path from 'path';

// Try multiple possible paths for .env file
const possiblePaths = [
    path.join(__dirname, '../../../.env'),     // From src/app/config to root
    path.join(process.cwd(), '.env'),          // Current working directory
    path.resolve('.env'),                       // Absolute path
];

let envLoaded = false;
for (const envPath of possiblePaths) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        console.log(`✅ Loaded .env from: ${envPath}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    console.warn('⚠️ No .env file found, using system environment variables');
}

export const config = {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:5000',
    databaseUrl: process.env.DATABASE_URL,

    jwt: {
        secret: process.env.JWT_SECRET,
        accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15d',
        refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
    },

    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    },
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    },
    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'),
    },

};

// Validate JWT_SECRET
if (!config.jwt.secret) {
    console.error('\n❌ JWT_SECRET is missing!');
    console.error('Please add JWT_SECRET to your .env file');
    console.error('Example: JWT_SECRET=your-super-secret-key-min-32-characters\n');

    if (config.nodeEnv === 'development') {
        console.warn('⚠️ Using default JWT_SECRET for development only!');
        config.jwt.secret = 'dev-secret-key-do-not-use-in-production';
    } else {
        process.exit(1);
    }
}



console.log('\n✅ Config loaded successfully');
console.log(`📦 Environment: ${config.nodeEnv}`);
console.log(`🔐 JWT Secret: ${config.jwt.secret ? '✓ Set' : '✗ Missing'}`);
console.log(`🗄️  Database URL: ${config.databaseUrl ? '✓ Configured' : '✗ Missing'}`);
console.log(`📍 API URL: ${config.appUrl}\n`);