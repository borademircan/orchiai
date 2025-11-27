import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { checkDatabaseConnection } from '@orchiai/database';

// Import routes
import authRoutes from './routes/auth';
import agentRoutes from './routes/agents';
import modelRoutes from './routes/models';
import toolRoutes from './routes/tools';
import triggerRoutes from './routes/triggers';
import memoryRoutes from './routes/memories';
import chatRoutes from './routes/chat';
import providerConnectionRoutes from './routes/provider-connections';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration - allow all origins for development
  app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging middleware
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn';
        } else if (res.statusCode >= 500 || err) {
          return 'error';
        }
        return 'info';
      },
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
      },
    })
  );

  // Root route - redirect to API info
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Orchi AI API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api/v1',
        docs: '/api/v1',
      },
    });
  });

  // Health check
  app.get('/health', async (req, res) => {
    const dbConnected = await checkDatabaseConnection();
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbConnected ? 'connected' : 'disconnected',
      },
    });
  });

  // API routes
  app.get('/api/v1', (req, res) => {
    res.json({
      success: true,
      data: {
        message: 'Orchi AI API v1',
        version: '1.0.0',
        endpoints: {
          auth: '/api/v1/auth',
          agents: '/api/v1/agents',
          models: '/api/v1/models',
          tools: '/api/v1/tools',
          triggers: '/api/v1/triggers',
          memories: '/api/v1/memories',
          chat: '/api/v1/chat',
          providerConnections: '/api/v1/provider-connections',
        },
      },
    });
  });

  // Mount routes
  // Auth routes (public)
  app.use('/api/v1/auth', authRoutes);

  // Protected routes (TODO: Add authentication middleware)
  // For now, these are open to allow testing. In production, add: authenticate middleware
  app.use('/api/v1/agents', agentRoutes);
  app.use('/api/v1/models', modelRoutes);
  app.use('/api/v1/tools', toolRoutes);
  app.use('/api/v1/triggers', triggerRoutes);
  app.use('/api/v1/memories', memoryRoutes);
  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/provider-connections', providerConnectionRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
