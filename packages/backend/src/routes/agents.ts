import { Router } from 'express';
import { z } from 'zod';
import { AgentService } from '../services/AgentService';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { MemoryStrategy, WhenCondition, RuntimeInput } from '@orchiai/shared';

const router = Router();
const agentService = new AgentService();

// Validation schemas
const createAgentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    instructions: z.string().min(1),
    modelId: z.string().uuid().optional(),
    memoryStrategy: z.nativeEnum(MemoryStrategy).optional(),
    memoryThreshold: z.number().int().positive().optional(),
    askBeforeSaving: z.boolean().optional(),
  }),
});

const updateAgentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    instructions: z.string().min(1).optional(),
    modelId: z.string().uuid().optional().nullable(),
    memoryStrategy: z.nativeEnum(MemoryStrategy).optional(),
    memoryThreshold: z.number().int().positive().optional(),
    askBeforeSaving: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

const createConsultRuleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    consultedAgentId: z.string().uuid(),
    whenCondition: z.nativeEnum(WhenCondition),
    conditionalRule: z.string().optional(),
    purpose: z.string().min(1),
    order: z.number().int().nonnegative(),
  }),
});

const attachToolSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    toolId: z.string().uuid(),
  }),
});

// ============================================
// AGENT CRUD ROUTES
// ============================================

// GET /api/v1/agents
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      modelId: req.query.modelId as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await agentService.listAgents(filters);

    res.json({
      success: true,
      data: result.agents,
      pagination: result.pagination,
    });
  })
);

// POST /api/v1/agents
router.post(
  '/',
  validate(createAgentSchema),
  asyncHandler(async (req, res) => {
    const agent = await agentService.createAgent(req.body);

    res.status(201).json({
      success: true,
      data: agent,
    });
  })
);

// GET /api/v1/agents/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const agent = await agentService.getAgent(req.params.id);

    res.json({
      success: true,
      data: agent,
    });
  })
);

// PATCH /api/v1/agents/:id
router.patch(
  '/:id',
  validate(updateAgentSchema),
  asyncHandler(async (req, res) => {
    const agent = await agentService.updateAgent(req.params.id, req.body);

    res.json({
      success: true,
      data: agent,
    });
  })
);

// DELETE /api/v1/agents/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await agentService.deleteAgent(req.params.id);

    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  })
);

// POST /api/v1/agents/:id/activate
router.post(
  '/:id/activate',
  asyncHandler(async (req, res) => {
    const agent = await agentService.activateAgent(req.params.id);

    res.json({
      success: true,
      data: agent,
    });
  })
);

// POST /api/v1/agents/:id/deactivate
router.post(
  '/:id/deactivate',
  asyncHandler(async (req, res) => {
    const agent = await agentService.deactivateAgent(req.params.id);

    res.json({
      success: true,
      data: agent,
    });
  })
);

// POST /api/v1/agents/:id/clone
router.post(
  '/:id/clone',
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required for cloned agent',
        },
      });
    }

    const agent = await agentService.cloneAgent(req.params.id, name);

    res.status(201).json({
      success: true,
      data: agent,
    });
  })
);

// ============================================
// CONSULT RULES ROUTES
// ============================================

// GET /api/v1/agents/:id/consults
router.get(
  '/:id/consults',
  asyncHandler(async (req, res) => {
    const rules = await agentService.getConsultRules(req.params.id);

    res.json({
      success: true,
      data: rules,
    });
  })
);

// POST /api/v1/agents/:id/consults
router.post(
  '/:id/consults',
  validate(createConsultRuleSchema),
  asyncHandler(async (req, res) => {
    const rule = await agentService.addConsultRule(req.params.id, req.body);

    res.status(201).json({
      success: true,
      data: rule,
    });
  })
);

// PATCH /api/v1/agents/:id/consults/:consultId
router.patch(
  '/:id/consults/:consultId',
  asyncHandler(async (req, res) => {
    const rule = await agentService.updateConsultRule(req.params.consultId, req.body);

    res.json({
      success: true,
      data: rule,
    });
  })
);

// DELETE /api/v1/agents/:id/consults/:consultId
router.delete(
  '/:id/consults/:consultId',
  asyncHandler(async (req, res) => {
    await agentService.removeConsultRule(req.params.consultId);

    res.json({
      success: true,
      message: 'Consult rule removed successfully',
    });
  })
);

// POST /api/v1/agents/:id/consults/reorder
router.post(
  '/:id/consults/reorder',
  asyncHandler(async (req, res) => {
    const { ruleIds } = req.body;
    if (!Array.isArray(ruleIds)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ruleIds must be an array',
        },
      });
    }

    await agentService.reorderConsultRules(req.params.id, ruleIds);

    res.json({
      success: true,
      message: 'Consult rules reordered successfully',
    });
  })
);

// ============================================
// TOOL MANAGEMENT ROUTES
// ============================================

// GET /api/v1/agents/:id/tools
router.get(
  '/:id/tools',
  asyncHandler(async (req, res) => {
    const tools = await agentService.getAgentTools(req.params.id);

    res.json({
      success: true,
      data: tools,
    });
  })
);

// POST /api/v1/agents/:id/tools
router.post(
  '/:id/tools',
  validate(attachToolSchema),
  asyncHandler(async (req, res) => {
    await agentService.attachTool(req.params.id, req.body.toolId);

    res.status(201).json({
      success: true,
      message: 'Tool attached successfully',
    });
  })
);

// DELETE /api/v1/agents/:id/tools/:toolId
router.delete(
  '/:id/tools/:toolId',
  asyncHandler(async (req, res) => {
    await agentService.detachTool(req.params.id, req.params.toolId);

    res.json({
      success: true,
      message: 'Tool detached successfully',
    });
  })
);

/**
 * POST /api/v1/agents/:id/execute
 * Execute an agent
 */
router.post(
  '/:id/execute',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      userMessage: z.string().min(1),
      sessionId: z.string().uuid().optional(),
      context: z.record(z.any()).optional(),
      metadata: z.record(z.any()).optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const runtimeInput = {
      entryAgentId: req.params.id,
      userMessage: req.body.userMessage,
      sessionId: req.body.sessionId,
      context: req.body.context,
      metadata: req.body.metadata,
    };

    const result = await agentService.executeAgent(runtimeInput);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/agents/:id/execute/stream
 * Execute an agent with real-time streaming
 */
router.post(
  '/:id/execute/stream',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      userMessage: z.string().min(1),
      sessionId: z.string().uuid().optional(),
      context: z.record(z.any()).optional(),
      metadata: z.record(z.any()).optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const runtimeInput = {
      entryAgentId: req.params.id,
      userMessage: req.body.userMessage,
      sessionId: req.body.sessionId,
      context: req.body.context,
      metadata: req.body.metadata,
    };

    try {
      await agentService.executeAgentStream(runtimeInput, (event) => {
        // Send SSE event
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      // Send error event
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: error.message || 'Execution failed' 
      })}\n\n`);
      res.end();
    }
  })
);

/**
 * POST /api/v1/agents/:id/orchestrate/plan
 * Step 1: Plan which agents to consult (no execution)
 */
router.post(
  '/:id/orchestrate/plan',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      userMessage: z.string().min(1),
      sessionId: z.string().uuid().optional(),
      context: z.record(z.any()).optional(),
      metadata: z.record(z.any()).optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await agentService.planConsultations({
      entryAgentId: req.params.id,
      userMessage: req.body.userMessage,
      sessionId: req.body.sessionId,
      context: req.body.context,
      metadata: req.body.metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/agents/consult
 * Step 2: Execute a single consultation
 */
router.post(
  '/consult',
  validate(z.object({
    body: z.object({
      agentId: z.string().uuid(),
      question: z.string().min(1),
      context: z.record(z.any()).optional(),
      sessionId: z.string().uuid().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await agentService.executeConsultation({
      agentId: req.body.agentId,
      question: req.body.question,
      context: req.body.context || {},
      sessionId: req.body.sessionId,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/agents/:id/orchestrate/synthesize
 * Step 3: Synthesize final response from consultation results
 */
router.post(
  '/:id/orchestrate/synthesize',
  validate(z.object({
    params: z.object({
      id: z.string().uuid(),
    }),
    body: z.object({
      userMessage: z.string().min(1),
      consultations: z.array(z.object({
        agentName: z.string(),
        purpose: z.string(),
        response: z.string(),
      })),
      context: z.record(z.any()).optional(),
      sessionId: z.string().uuid().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await agentService.synthesizeFinalResponse({
      agentId: req.params.id,
      userMessage: req.body.userMessage,
      consultations: req.body.consultations,
      context: req.body.context || {},
      sessionId: req.body.sessionId,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/agents/conversational-message
 * Handle conversational messages with @mentions and orchestrator prompts
 */
router.post(
  '/conversational-message',
  validate(z.object({
    body: z.object({
      message: z.string().min(1),
      sessionId: z.string().uuid(),
      agentId: z.string().uuid(),
      conversationHistory: z.array(z.object({
        role: z.string(),
        content: z.string(),
        metadata: z.record(z.any()).optional(),
      })).optional(),
      autoMode: z.boolean().optional(),
      orchestrationMode: z.enum(['FLOW', 'QA']).optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const result = await agentService.handleConversationalMessage({
      message: req.body.message,
      sessionId: req.body.sessionId,
      agentId: req.body.agentId,
      conversationHistory: req.body.conversationHistory || [],
      autoMode: req.body.autoMode || false,
      orchestrationMode: req.body.orchestrationMode,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/agents/conversational-message/stream
 * Handle conversational messages with Server-Sent Events streaming
 */
router.post(
  '/conversational-message/stream',
  validate(z.object({
    body: z.object({
      message: z.string().min(1),
      sessionId: z.string().uuid(),
      agentId: z.string().uuid(),
      conversationHistory: z.array(z.object({
        role: z.string(),
        content: z.string(),
        metadata: z.record(z.any()).optional(),
      })).optional(),
      autoMode: z.boolean().optional(),
      orchestrationMode: z.enum(['FLOW', 'QA']).optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      await agentService.handleConversationalMessageStream({
        message: req.body.message,
        sessionId: req.body.sessionId,
        agentId: req.body.agentId,
        conversationHistory: req.body.conversationHistory || [],
        autoMode: req.body.autoMode || false,
        orchestrationMode: req.body.orchestrationMode,
      }, (event) => {
        // Send SSE event
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      // Send error event
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message || 'Processing failed'
      })}\n\n`);
      res.end();
    }
  })
);

export default router;
