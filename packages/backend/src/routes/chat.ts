import { Router } from 'express';
import { z } from 'zod';
import chatService from '../services/ChatService';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { MessageRole, OrchestrationMode } from '@orchiai/shared';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createSessionSchema = z.object({
  body: z.object({
    agentId: z.string().uuid(),
    userId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

const updateSessionSchema = z.object({
  body: z.object({
    metadata: z.record(z.any()).optional(),
    orchestrationMode: z.nativeEnum(OrchestrationMode).optional(),
  }),
});

const listSessionsSchema = z.object({
  query: z.object({
    agentId: z.string().uuid().optional(),
    userId: z.string().optional(),
    page: z.string().transform(val => parseInt(val, 10)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
});

const createMessageSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid(),
    role: z.nativeEnum(MessageRole),
    content: z.string().min(1),
    metadata: z.record(z.any()).optional(),
  }),
});

const updateMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

const listMessagesSchema = z.object({
  query: z.object({
    role: z.nativeEnum(MessageRole).optional(),
    page: z.string().transform(val => parseInt(val, 10)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
});

// ============================================
// SESSION ROUTES
// ============================================

/**
 * GET /api/v1/chat/sessions
 * List all chat sessions with optional filters
 */
router.get(
  '/sessions',
  validate(listSessionsSchema),
  asyncHandler(async (req, res) => {
    const { agentId, userId, page, limit } = req.query;

    const result = await chatService.listSessions({
      agentId: agentId as string | undefined,
      userId: userId as string | undefined,
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
 * GET /api/v1/chat/sessions/agent/:agentId
 * Get all sessions for a specific agent
 */
router.get(
  '/sessions/agent/:agentId',
  asyncHandler(async (req, res) => {
    const { agentId } = req.params;

    const sessions = await chatService.getSessionsByAgent(agentId);

    res.json({
      success: true,
      data: sessions,
    });
  })
);

/**
 * GET /api/v1/chat/sessions/user/:userId
 * Get all sessions for a specific user
 */
router.get(
  '/sessions/user/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const sessions = await chatService.getSessionsByUser(userId);

    res.json({
      success: true,
      data: sessions,
    });
  })
);

/**
 * POST /api/v1/chat/sessions
 * Create a new chat session
 */
router.post(
  '/sessions',
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await chatService.createSession(req.body);

    res.status(201).json({
      success: true,
      data: session,
    });
  })
);

/**
 * GET /api/v1/chat/sessions/:id
 * Get a specific chat session
 */
router.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const session = await chatService.getSession(req.params.id);

    res.json({
      success: true,
      data: session,
    });
  })
);

/**
 * PATCH /api/v1/chat/sessions/:id
 * Update a chat session
 */
router.patch(
  '/sessions/:id',
  validate(updateSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await chatService.updateSession(req.params.id, req.body);

    res.json({
      success: true,
      data: session,
    });
  })
);

/**
 * DELETE /api/v1/chat/sessions/:id
 * Delete a chat session (cascades to messages)
 */
router.delete(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    await chatService.deleteSession(req.params.id);

    res.json({
      success: true,
      message: 'Chat session deleted successfully',
    });
  })
);

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * GET /api/v1/chat/sessions/:sessionId/messages
 * List all messages for a session
 */
router.get(
  '/sessions/:sessionId/messages',
  validate(listMessagesSchema),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { role, page, limit } = req.query;

    const result = await chatService.listMessages({
      sessionId,
      role: role as MessageRole | undefined,
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
 * GET /api/v1/chat/messages/:id
 * Get a specific chat message
 */
router.get(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const message = await chatService.getMessage(req.params.id);

    res.json({
      success: true,
      data: message,
    });
  })
);

/**
 * POST /api/v1/chat/messages
 * Create a new chat message
 */
router.post(
  '/messages',
  validate(createMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.createMessage(req.body);

    res.status(201).json({
      success: true,
      data: message,
    });
  })
);

/**
 * PATCH /api/v1/chat/messages/:id
 * Update a chat message
 */
router.patch(
  '/messages/:id',
  validate(updateMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.updateMessage(req.params.id, req.body);

    res.json({
      success: true,
      data: message,
    });
  })
);

/**
 * DELETE /api/v1/chat/messages/:id
 * Delete a chat message
 */
router.delete(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    await chatService.deleteMessage(req.params.id);

    res.json({
      success: true,
      message: 'Chat message deleted successfully',
    });
  })
);

export default router;

