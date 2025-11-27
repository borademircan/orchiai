import { Router } from 'express';
import { z } from 'zod';
import providerConnectionService from '../services/ProviderConnectionService';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createConnectionSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    type: z.string().max(100).optional(), // Connection type (e.g., "apiKey", "basicAuth", "oauth2", etc.)
    apiKey: z.string().min(1).optional(), // Optional for backward compatibility
    endpoint: z.string().url().optional().or(z.literal('')),
    metadata: z.record(z.any()).optional(), // Stores all credential fields
    credentials: z.record(z.any()).optional(), // Alternative to metadata
  }).refine((data) => {
    // Either apiKey or metadata/credentials must be provided
    return data.apiKey || data.metadata || data.credentials;
  }, {
    message: 'Either apiKey or metadata/credentials must be provided',
  }),
});

const updateConnectionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    type: z.string().max(100).optional(),
    apiKey: z.string().min(1).optional(),
    endpoint: z.string().url().optional().or(z.literal('')),
    metadata: z.record(z.any()).optional(),
  }),
});

const listConnectionsSchema = z.object({
  query: z.object({
    type: z.string().optional(), // Filter by connection type
    search: z.string().optional(),
    page: z.string().transform(val => parseInt(val, 10)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
});

// Routes

/**
 * GET /api/v1/provider-connections
 * List all provider connections with optional filters
 */
router.get(
  '/',
  validate(listConnectionsSchema),
  asyncHandler(async (req, res) => {
    const { type, search, page, limit } = req.query;

    const result = await providerConnectionService.listConnections({
      type: type as string | undefined,
      search: search as string | undefined,
      page: page as number | undefined,
      limit: limit as number | undefined,
    });

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * POST /api/v1/provider-connections
 * Create a new provider connection
 */
router.post(
  '/',
  validate(createConnectionSchema),
  asyncHandler(async (req, res) => {
    const connection = await providerConnectionService.createConnection(req.body);

    res.status(201).json({
      success: true,
      data: connection,
    });
  })
);

/**
 * GET /api/v1/provider-connections/:id
 * Get a single provider connection by ID
 */
router.get(
  '/:id',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const connection = await providerConnectionService.getConnection(req.params.id);

    res.json({
      success: true,
      data: connection,
    });
  })
);

/**
 * PATCH /api/v1/provider-connections/:id
 * Update a provider connection
 */
router.patch(
  '/:id',
  validate(updateConnectionSchema),
  asyncHandler(async (req, res) => {
    const connection = await providerConnectionService.updateConnection(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      data: connection,
    });
  })
);

/**
 * DELETE /api/v1/provider-connections/:id
 * Delete a provider connection
 */
router.delete(
  '/:id',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
  })),
  asyncHandler(async (req, res) => {
    await providerConnectionService.deleteConnection(req.params.id);

    res.json({
      success: true,
      data: { message: 'Provider connection deleted successfully' },
    });
  })
);

/**
 * GET /api/v1/provider-connections/type/:type
 * Get all connections for a specific type
 */
router.get(
  '/type/:type',
  validate(z.object({
    params: z.object({
      type: z.string(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const connections = await providerConnectionService.getConnectionsByType(
      req.params.type
    );

    res.json({
      success: true,
      data: connections,
    });
  })
);

/**
 * POST /api/v1/provider-connections/test
 * Test a provider connection before saving
 */
router.post(
  '/test',
  validate(z.object({
    body: z.object({
      type: z.string().optional(), // Connection type (optional)
      apiKey: z.string().optional(), // For backward compatibility
      endpoint: z.string().optional().transform(val => val && val.trim() ? val.trim() : undefined),
      credentials: z.record(z.any()).optional(), // Credential fields
    }),
  })),
  asyncHandler(async (req, res) => {
    // Extract apiKey from credentials if not provided directly
    const apiKey = req.body.apiKey || req.body.credentials?.apiKey || '';
    const endpoint = req.body.endpoint || req.body.credentials?.endpoint || undefined;

    const result = await providerConnectionService.testConnection(
      req.body.type,
      apiKey,
      endpoint
    );

    res.json({
      success: result.success,
      data: result,
    });
  })
);

export default router;

