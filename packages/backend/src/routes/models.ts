import { Router } from 'express';
import { z } from 'zod';
import modelService from '../services/ModelService';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { Provider } from '@orchiai/shared';

const router = Router();

// Validation schemas
const createModelSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    provider: z.nativeEnum(Provider),
    modelId: z.string().min(1).max(255),
    endpoint: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    connectionId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateModelSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    endpoint: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    connectionId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

const cloneModelSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
  }),
});

const listModelsSchema = z.object({
  query: z.object({
    provider: z.nativeEnum(Provider).optional(),
    isActive: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
    page: z.string().transform(val => parseInt(val, 10)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
});

// Routes

/**
 * GET /api/v1/models
 * List all models with optional filters
 */
router.get(
  '/',
  validate(listModelsSchema),
  asyncHandler(async (req, res) => {
    const { provider, isActive, search, page, limit } = req.query;

    const result = await modelService.listModels({
      provider: provider as Provider | undefined,
      isActive: isActive as boolean | undefined,
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
 * GET /api/v1/models/active
 * Get all active models
 */
router.get(
  '/active',
  asyncHandler(async (req, res) => {
    const models = await modelService.getActiveModels();

    res.json({
      success: true,
      data: models,
    });
  })
);

/**
 * GET /api/v1/models/provider/:provider
 * Get models by provider
 */
router.get(
  '/provider/:provider',
  asyncHandler(async (req, res) => {
    const { provider } = req.params;

    // Validate provider enum
    if (!Object.values(Provider).includes(provider as Provider)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: `Invalid provider. Must be one of: ${Object.values(Provider).join(', ')}`,
        },
      });
    }

    const models = await modelService.getModelsByProvider(provider as Provider);

    res.json({
      success: true,
      data: models,
    });
  })
);

/**
 * POST /api/v1/models
 * Create a new model
 */
router.post(
  '/',
  validate(createModelSchema),
  asyncHandler(async (req, res) => {
    const model = await modelService.createModel(req.body);

    res.status(201).json({
      success: true,
      data: model,
    });
  })
);

/**
 * GET /api/v1/models/:id
 * Get a specific model
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const model = await modelService.getModel(req.params.id);

    res.json({
      success: true,
      data: model,
    });
  })
);

/**
 * PATCH /api/v1/models/:id
 * Update a model
 */
router.patch(
  '/:id',
  validate(updateModelSchema),
  asyncHandler(async (req, res) => {
    const model = await modelService.updateModel(req.params.id, req.body);

    res.json({
      success: true,
      data: model,
    });
  })
);

/**
 * DELETE /api/v1/models/:id
 * Delete a model
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await modelService.deleteModel(req.params.id);

    res.json({
      success: true,
      message: 'Model deleted successfully',
    });
  })
);

/**
 * POST /api/v1/models/:id/activate
 * Activate a model
 */
router.post(
  '/:id/activate',
  asyncHandler(async (req, res) => {
    const model = await modelService.activateModel(req.params.id);

    res.json({
      success: true,
      data: model,
    });
  })
);

/**
 * POST /api/v1/models/:id/deactivate
 * Deactivate a model
 */
router.post(
  '/:id/deactivate',
  asyncHandler(async (req, res) => {
    const model = await modelService.deactivateModel(req.params.id);

    res.json({
      success: true,
      data: model,
    });
  })
);

/**
 * POST /api/v1/models/:id/clone
 * Clone a model
 */
router.post(
  '/:id/clone',
  validate(cloneModelSchema),
  asyncHandler(async (req, res) => {
    const model = await modelService.cloneModel(req.params.id, req.body.name);

    res.status(201).json({
      success: true,
      data: model,
    });
  })
);

/**
 * POST /api/v1/models/:id/test
 * Test model connection
 */
router.post(
  '/:id/test',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await modelService.testConnection(req.params.id);

    res.json({
      success: result.success,
      data: result,
    });
  })
);

export default router;
