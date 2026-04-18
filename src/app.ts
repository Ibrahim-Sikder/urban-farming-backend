import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './app/config';
import { globalLimiter } from './app/shared/middleware/rateLimiter';
import { notFound } from './app/shared/middleware/notFound';
import router from './app/routes';
import globalErrorHandler from './app/shared/middleware/globalErrorHandler';
import { swaggerServe, swaggerSetup } from './app/docs/swaggerUI';
import { swaggerSpec } from './app/docs/swagger';

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(globalLimiter);

app.use('/api-docs', swaggerServe, swaggerSetup);

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
app.get('/', (req: Request, res: Response) => {
    res.json({
        status: 'success',
        message: 'Urban Farming API is running',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
    });
});

app.use('/api/v1', router);

app.use(notFound);
app.use(globalErrorHandler);

export default app;