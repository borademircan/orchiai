import { Router } from 'express';
import { z } from 'zod';
import memoryService from '../services/MemoryService';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { MemoryType } from '@orchiai/shared';

const router = Router();

// Validation schemas
const createMemorySchema = z.object({
  body: z.object({
    agentId: z.string().uuid(),
    type: z.nativeEnum(MemoryType),
    content: z.string().min(1),
    metadata: z.record(z.any()).optional(),
    expiresAt: z.union([z.string().datetime(), z.date()]).optional(),
  }),
});

const updateMemorySchema = z.object({
  body: z.object({
    content: z.string().min(1).optional(),
    metadata: z.record(z.any()).optional(),
    expiresAt: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
  }),
});

const listMemoriesSchema = z.object({
  query: z.object({
    agentId: z.string().uuid().optional(),
    type: z.nativeEnum(MemoryType).optional(),
    includeExpired: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
    page: z.string().transform(val => parseInt(val, 10)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
});

// Routes

/**
 * GET /api/v1/memories
 * List all memory items with optional filters
 */
router.get(
  '/',
  validate(listMemoriesSchema),
  asyncHandler(async (req, res) => {
    const { agentId, type, includeExpired, search, page, limit } = req.query;

    const result = await memoryService.listMemories({
      agentId: agentId as string | undefined,
      type: type as MemoryType | undefined,
      includeExpired: includeExpired as boolean | undefined,
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
 * GET /api/v1/memories/expired
 * Get all expired memory items
 */
router.get(
  '/expired',
  asyncHandler(async (req, res) => {
    const memories = await memoryService.getExpiredMemories();

    res.json({
      success: true,
      data: memories,
    });
  })
);

/**
 * DELETE /api/v1/memories/expired
 * Delete all expired memory items
 */
router.delete(
  '/expired',
  asyncHandler(async (req, res) => {
    const count = await memoryService.deleteExpiredMemories();

    res.json({
      success: true,
      message: `Deleted ${count} expired memory item(s)`,
      data: { count },
    });
  })
);

/**
 * GET /api/v1/memories/type/:type
 * Get memory items by type
 */
router.get(
  '/type/:type',
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { includeExpired } = req.query;

    // Validate memory type enum
    if (!Object.values(MemoryType).includes(type as MemoryType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MEMORY_TYPE',
          message: `Invalid memory type. Must be one of: ${Object.values(MemoryType).join(', ')}`,
        },
      });
    }

    const memories = await memoryService.getMemoriesByType(
      type as MemoryType,
      includeExpired === 'true'
    );

    res.json({
      success: true,
      data: memories,
    });
  })
);

/**
 * GET /api/v1/memories/agent/:agentId
 * Get memory items for a specific agent
 */
router.get(
  '/agent/:agentId',
  asyncHandler(async (req, res) => {
    const { agentId } = req.params;
    const { includeExpired } = req.query;

    const memories = await memoryService.getMemoriesByAgent(
      agentId,
      includeExpired === 'true'
    );

    res.json({
      success: true,
      data: memories,
    });
  })
);

/**
 * GET /api/v1/memories/agent/:agentId/active
 * Get active (non-expired) memory items for an agent
 */
router.get(
  '/agent/:agentId/active',
  asyncHandler(async (req, res) => {
    const { agentId } = req.params;

    const memories = await memoryService.getActiveMemoriesByAgent(agentId);

    res.json({
      success: true,
      data: memories,
    });
  })
);

/**
 * POST /api/v1/memories
 * Create a new memory item
 */
router.post(
  '/',
  validate(createMemorySchema),
  asyncHandler(async (req, res) => {
    const memory = await memoryService.createMemory(req.body);

    res.status(201).json({
      success: true,
      data: memory,
    });
  })
);

/**
 * GET /api/v1/memories/:id
 * Get a specific memory item
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const memory = await memoryService.getMemory(req.params.id);

    res.json({
      success: true,
      data: memory,
    });
  })
);

/**
 * PATCH /api/v1/memories/:id
 * Update a memory item
 */
router.patch(
  '/:id',
  validate(updateMemorySchema),
  asyncHandler(async (req, res) => {
    const memory = await memoryService.updateMemory(req.params.id, req.body);

    res.json({
      success: true,
      data: memory,
    });
  })
);

/**
 * DELETE /api/v1/memories/:id
 * Delete a memory item
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await memoryService.deleteMemory(req.params.id);

    res.json({
      success: true,
      message: 'Memory item deleted successfully',
    });
  })
);

/**
 * POST /api/v1/memories/agents/:agentId/should-summarize
 * Check if memory should be summarized for an agent
 */
router.post(
  '/agents/:agentId/should-summarize',
  validate(z.object({
    params: z.object({
      agentId: z.string().uuid(),
    }),
    body: z.object({
      threshold: z.number().int().positive(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const shouldSummarize = await memoryService.shouldSummarize(
      req.params.agentId,
      req.body.threshold
    );

    res.json({
      success: true,
      data: {
        shouldSummarize,
        agentId: req.params.agentId,
        threshold: req.body.threshold,
      },
    });
  })
);

/**
 * POST /api/v1/memories/agents/:agentId/summarize
 * Summarize memories for an agent
 */
router.post(
  '/agents/:agentId/summarize',
  validate(z.object({
    params: z.object({
      agentId: z.string().uuid(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const summary = await memoryService.summarizeMemory(req.params.agentId);

    res.json({
      success: true,
      data: {
        summary,
        agentId: req.params.agentId,
      },
    });
  })
);

/**
 * GET /api/v1/memories/agents/:agentId/context
 * Get memory context for an agent (includes summaries if available)
 */
router.get(
  '/agents/:agentId/context',
  validate(z.object({
    params: z.object({
      agentId: z.string().uuid(),
    }),
    query: z.object({
      limit: z.string().optional(),
    }).passthrough(),
  })),
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const context = await memoryService.getMemoryContext(req.params.agentId, limit);

    res.json({
      success: true,
      data: {
        context,
        agentId: req.params.agentId,
        limit,
      },
    });
  })
);

/**
 * POST /api/v1/memories/agents/:agentId/approve
 * Approve pending memory (for ASK_USER strategy)
 */
router.post(
  '/agents/:agentId/approve',
  validate(z.object({
    params: z.object({
      agentId: z.string().uuid(),
    }),
    body: z.object({
      content: z.string().min(1),
    }),
  })),
  asyncHandler(async (req, res) => {
    const memory = await memoryService.approveMemory(
      req.params.agentId,
      req.body.content
    );

    res.json({
      success: true,
      data: memory,
    });
  })
);

export default router;

