import { Router } from 'express';
import { z } from 'zod';
import triggerService from '../services/TriggerService';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { TriggerType } from '@orchiai/shared';

const router = Router();

// Validation schemas
const createTriggerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    type: z.nativeEnum(TriggerType),
    agentId: z.string().uuid(),
    config: z.record(z.any()),
    secretToken: z.string().optional(),
    isEnabled: z.boolean().optional(),
  }),
});

const updateTriggerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    config: z.record(z.any()).optional(),
    isEnabled: z.boolean().optional(),
    secretToken: z.string().optional(),
  }),
});

const listTriggersSchema = z.object({
  query: z.object({
    type: z.nativeEnum(TriggerType).optional(),
    agentId: z.string().uuid().optional(),
    isEnabled: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
    page: z.string().transform(val => parseInt(val, 10)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
});

// Routes

/**
 * GET /api/v1/triggers
 * List all triggers with optional filters
 */
router.get(
  '/',
  validate(listTriggersSchema),
  asyncHandler(async (req, res) => {
    const { type, agentId, isEnabled, search, page, limit } = req.query;

    const result = await triggerService.listTriggers({
      type: type as TriggerType | undefined,
      agentId: agentId as string | undefined,
      isEnabled: isEnabled as boolean | undefined,
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
 * GET /api/v1/triggers/enabled
 * Get all enabled triggers
 */
router.get(
  '/enabled',
  asyncHandler(async (req, res) => {
    const triggers = await triggerService.getEnabledTriggers();

    res.json({
      success: true,
      data: triggers,
    });
  })
);

/**
 * GET /api/v1/triggers/type/:type
 * Get triggers by type
 */
router.get(
  '/type/:type',
  asyncHandler(async (req, res) => {
    const { type } = req.params;

    // Validate trigger type enum
    if (!Object.values(TriggerType).includes(type as TriggerType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TRIGGER_TYPE',
          message: `Invalid trigger type. Must be one of: ${Object.values(TriggerType).join(', ')}`,
        },
      });
    }

    const triggers = await triggerService.getTriggersByType(type as TriggerType);

    res.json({
      success: true,
      data: triggers,
    });
  })
);

/**
 * GET /api/v1/triggers/agent/:agentId
 * Get triggers for a specific agent
 */
router.get(
  '/agent/:agentId',
  asyncHandler(async (req, res) => {
    const { agentId } = req.params;

    const triggers = await triggerService.getTriggersByAgent(agentId);

    res.json({
      success: true,
      data: triggers,
    });
  })
);

/**
 * POST /api/v1/triggers
 * Create a new trigger
 */
router.post(
  '/',
  validate(createTriggerSchema),
  asyncHandler(async (req, res) => {
    const trigger = await triggerService.createTrigger(req.body);

    res.status(201).json({
      success: true,
      data: trigger,
    });
  })
);

/**
 * GET /api/v1/triggers/:id
 * Get a specific trigger
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const trigger = await triggerService.getTrigger(req.params.id);

    res.json({
      success: true,
      data: trigger,
    });
  })
);

/**
 * PATCH /api/v1/triggers/:id
 * Update a trigger
 */
router.patch(
  '/:id',
  validate(updateTriggerSchema),
  asyncHandler(async (req, res) => {
    const trigger = await triggerService.updateTrigger(req.params.id, req.body);

    res.json({
      success: true,
      data: trigger,
    });
  })
);

/**
 * DELETE /api/v1/triggers/:id
 * Delete a trigger
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await triggerService.deleteTrigger(req.params.id);

    res.json({
      success: true,
      message: 'Trigger deleted successfully',
    });
  })
);

/**
 * POST /api/v1/triggers/:id/enable
 * Enable a trigger
 */
router.post(
  '/:id/enable',
  asyncHandler(async (req, res) => {
    const trigger = await triggerService.enableTrigger(req.params.id);

    res.json({
      success: true,
      data: trigger,
    });
  })
);

/**
 * POST /api/v1/triggers/:id/disable
 * Disable a trigger
 */
router.post(
  '/:id/disable',
  asyncHandler(async (req, res) => {
    const trigger = await triggerService.disableTrigger(req.params.id);

    res.json({
      success: true,
      data: trigger,
    });
  })
);

/**
 * POST /api/v1/triggers/:id/execute/chat
 * Execute a chat trigger
 */
router.post(
  '/:id/execute/chat',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      message: z.string().min(1),
      sessionId: z.string().uuid().optional(),
      userId: z.string().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await triggerService.handleChatTrigger(
      req.params.id,
      req.body.message,
      req.body.sessionId,
      req.body.userId
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.response,
        meta: {
          executionTimeMs: result.executionTimeMs,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRIGGER_EXECUTION_FAILED',
          message: result.error || 'Trigger execution failed',
        },
        meta: {
          executionTimeMs: result.executionTimeMs,
        },
      });
    }
  })
);

/**
 * POST /api/v1/triggers/:id/execute/webhook
 * Execute a webhook trigger
 */
router.post(
  '/:id/execute/webhook',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.record(z.any()),
  })),
  asyncHandler(async (req, res) => {
    // Get signature from header if present
    const signature = req.headers['x-signature'] as string || 
                     req.headers['x-webhook-signature'] as string ||
                     req.headers['x-hub-signature-256'] as string;

    const result = await triggerService.handleWebhookTrigger(
      req.params.id,
      req.body,
      signature
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.response,
        meta: {
          executionTimeMs: result.executionTimeMs,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRIGGER_EXECUTION_FAILED',
          message: result.error || 'Trigger execution failed',
        },
        meta: {
          executionTimeMs: result.executionTimeMs,
        },
      });
    }
  })
);

/**
 * POST /api/v1/triggers/:id/execute/scheduled
 * Manually execute a scheduled trigger
 */
router.post(
  '/:id/execute/scheduled',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await triggerService.executeScheduledTrigger(req.params.id);

    if (result.success) {
      res.json({
        success: true,
        data: result.response,
        meta: {
          executionTimeMs: result.executionTimeMs,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRIGGER_EXECUTION_FAILED',
          message: result.error || 'Trigger execution failed',
        },
        meta: {
          executionTimeMs: result.executionTimeMs,
        },
      });
    }
  })
);

/**
 * POST /api/v1/triggers/:id/validate
 * Validate trigger configuration
 */
router.post(
  '/:id/validate',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const validation = await triggerService.validateTrigger(req.params.id);

    res.json({
      success: validation.valid,
      data: validation,
    });
  })
);

export default router;

