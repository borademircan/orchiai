import { Router } from 'express';
import { z } from 'zod';
import toolService from '../services/ToolService';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { ToolType, HttpMethod } from '@orchiai/shared';

const router = Router();

// Validation schemas
const createToolSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().min(1),
    type: z.nativeEnum(ToolType),
    endpoint: z.string().url().optional(),
    method: z.nativeEnum(HttpMethod).optional(),
    schema: z.record(z.any()),
    connectionId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateToolSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    endpoint: z.string().url().optional(),
    method: z.nativeEnum(HttpMethod).optional(),
    schema: z.record(z.any()).optional(),
    connectionId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});

const listToolsSchema = z.object({
  query: z.object({
    type: z.nativeEnum(ToolType).optional(),
    isActive: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
    page: z.string().transform(val => parseInt(val, 10)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
});

// Routes

/**
 * GET /api/v1/tools
 * List all tools with optional filters
 */
router.get(
  '/',
  validate(listToolsSchema),
  asyncHandler(async (req, res) => {
    const { type, isActive, search, page, limit } = req.query;

    const result = await toolService.listTools({
      type: type as ToolType | undefined,
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
 * GET /api/v1/tools/active
 * Get all active tools
 */
router.get(
  '/active',
  asyncHandler(async (req, res) => {
    const tools = await toolService.getActiveTools();

    res.json({
      success: true,
      data: tools,
    });
  })
);

/**
 * GET /api/v1/tools/type/:type
 * Get tools by type
 */
router.get(
  '/type/:type',
  asyncHandler(async (req, res) => {
    const { type } = req.params;

    // Validate tool type enum
    if (!Object.values(ToolType).includes(type as ToolType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOOL_TYPE',
          message: `Invalid tool type. Must be one of: ${Object.values(ToolType).join(', ')}`,
        },
      });
    }

    const tools = await toolService.getToolsByType(type as ToolType);

    res.json({
      success: true,
      data: tools,
    });
  })
);

/**
 * POST /api/v1/tools
 * Create a new tool
 */
router.post(
  '/',
  validate(createToolSchema),
  asyncHandler(async (req, res) => {
    const tool = await toolService.createTool(req.body);

    res.status(201).json({
      success: true,
      data: tool,
    });
  })
);

/**
 * GET /api/v1/tools/:id
 * Get a specific tool
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tool = await toolService.getTool(req.params.id);

    res.json({
      success: true,
      data: tool,
    });
  })
);

/**
 * PATCH /api/v1/tools/:id
 * Update a tool
 */
router.patch(
  '/:id',
  validate(updateToolSchema),
  asyncHandler(async (req, res) => {
    const tool = await toolService.updateTool(req.params.id, req.body);

    res.json({
      success: true,
      data: tool,
    });
  })
);

/**
 * DELETE /api/v1/tools/:id
 * Delete a tool
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await toolService.deleteTool(req.params.id);

    res.json({
      success: true,
      message: 'Tool deleted successfully',
    });
  })
);

/**
 * POST /api/v1/tools/:id/activate
 * Activate a tool
 */
router.post(
  '/:id/activate',
  asyncHandler(async (req, res) => {
    const tool = await toolService.activateTool(req.params.id);

    res.json({
      success: true,
      data: tool,
    });
  })
);

/**
 * POST /api/v1/tools/:id/deactivate
 * Deactivate a tool
 */
router.post(
  '/:id/deactivate',
  asyncHandler(async (req, res) => {
    const tool = await toolService.deactivateTool(req.params.id);

    res.json({
      success: true,
      data: tool,
    });
  })
);

/**
 * POST /api/v1/tools/:id/execute
 * Execute a tool with parameters
 */
router.post(
  '/:id/execute',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      parameters: z.record(z.any()),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await toolService.executeTool(req.params.id, req.body.parameters);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        meta: {
          statusCode: result.statusCode,
          executionTimeMs: result.executionTimeMs,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'TOOL_EXECUTION_FAILED',
          message: result.error || 'Tool execution failed',
        },
        meta: {
          executionTimeMs: result.executionTimeMs,
        },
      });
    }
  })
);

/**
 * POST /api/v1/tools/:id/test
 * Test tool connection
 */
router.post(
  '/:id/test',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await toolService.testConnection(req.params.id);

    res.json({
      success: result.success,
      data: result,
    });
  })
);

export default router;
