import { prisma } from '@orchiai/database';
import { BaseService } from './BaseService';
import {
  CreateChatSessionDTO,
  UpdateChatSessionDTO,
  CreateChatMessageDTO,
  UpdateChatMessageDTO,
  ChatSession,
  ChatMessage,
  MessageRole,
} from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';

export class ChatService extends BaseService {
  constructor() {
    super('ChatService');
  }

  // ============================================
  // CHAT SESSION METHODS
  // ============================================

  /**
   * Create a new chat session
   */
  async createSession(data: CreateChatSessionDTO): Promise<ChatSession> {
    this.logger.info({ agentId: data.agentId, userId: data.userId }, 'Creating new chat session');

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: data.agentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    const session = await prisma.chatSession.create({
      data: {
        agentId: data.agentId,
        userId: data.userId,
        metadata: data.metadata,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    this.logger.info({ sessionId: session.id }, 'Chat session created successfully');
    return session as unknown as ChatSession;
  }

  /**
   * Get a single chat session by ID
   */
  async getSession(id: string): Promise<ChatSession> {
    this.logger.info({ sessionId: id }, 'Fetching chat session');

    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', 'SESSION_NOT_FOUND');
    }

    return session as unknown as ChatSession;
  }

  /**
   * List chat sessions with optional filtering
   */
  async listSessions(params: {
    agentId?: string;
    userId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    this.logger.info('Listing chat sessions');

    const {
      agentId,
      userId,
      search,
      page = 1,
      limit = 50,
    } = params;

    const where: any = {};

    if (agentId) {
      where.agentId = agentId;
    }

    if (userId) {
      where.userId = userId;
    }

    // Note: Search would need to search through messages, which is complex
    // For now, we'll skip search on sessions

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chatSession.count({ where }),
    ]);

    return {
      data: sessions as unknown as ChatSession[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a chat session
   */
  async updateSession(id: string, data: UpdateChatSessionDTO): Promise<ChatSession> {
    this.logger.info({ sessionId: id }, 'Updating chat session');

    // Check if session exists
    await this.getSession(id);

    const session = await prisma.chatSession.update({
      where: { id },
      data: {
        metadata: data.metadata,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    this.logger.info({ sessionId: id }, 'Chat session updated successfully');
    return session as unknown as ChatSession;
  }

  /**
   * Delete a chat session (cascades to messages)
   */
  async deleteSession(id: string): Promise<void> {
    this.logger.info({ sessionId: id }, 'Deleting chat session');

    await this.getSession(id);

    await prisma.chatSession.delete({
      where: { id },
    });

    this.logger.info({ sessionId: id }, 'Chat session deleted successfully');
  }

  /**
   * Get sessions by agent
   */
  async getSessionsByAgent(agentId: string): Promise<ChatSession[]> {
    this.logger.info({ agentId }, 'Fetching chat sessions for agent');

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    const sessions = await prisma.chatSession.findMany({
      where: { agentId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return sessions as unknown as ChatSession[];
  }

  /**
   * Get sessions by user
   */
  async getSessionsByUser(userId: string): Promise<ChatSession[]> {
    this.logger.info({ userId }, 'Fetching chat sessions for user');

    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return sessions as unknown as ChatSession[];
  }

  // ============================================
  // CHAT MESSAGE METHODS
  // ============================================

  /**
   * Create a new chat message
   */
  async createMessage(data: CreateChatMessageDTO): Promise<ChatMessage> {
    this.logger.info({ sessionId: data.sessionId, role: data.role }, 'Creating new chat message');

    // Verify session exists
    const session = await prisma.chatSession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', 'SESSION_NOT_FOUND');
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        metadata: data.metadata,
      },
    });

    // Check if this is the first user message and session has no title
    this.logger.info({ role: data.role, hasTitle: !!session.title, sessionId: data.sessionId }, 'DEBUG: Checking title generation conditions');
    if (data.role === MessageRole.USER && !session.title) {
      const messageCount = await prisma.chatMessage.count({
        where: {
          sessionId: data.sessionId,
          role: MessageRole.USER,
        },
      });

      this.logger.info({ messageCount, sessionId: data.sessionId }, 'DEBUG: User message count after creation');
      // If this is the first user message, generate a title
      if (messageCount === 1) {
        this.logger.info({ sessionId: data.sessionId }, 'Generating title for new chat session');
        const title = await this.generateChatTitle(data.content);

        // Update session with generated title
        await prisma.chatSession.update({
          where: { id: data.sessionId },
          data: {
            title,
            lastMessageAt: new Date(),
          },
        });
      } else {
        // Just update lastMessageAt
        await prisma.chatSession.update({
          where: { id: data.sessionId },
          data: {
            lastMessageAt: new Date(),
          },
        });
      }
    } else {
      // Update session's lastMessageAt
      await prisma.chatSession.update({
        where: { id: data.sessionId },
        data: {
          lastMessageAt: new Date(),
        },
      });
    }

    this.logger.info({ messageId: message.id }, 'Chat message created successfully');
    return message as unknown as ChatMessage;
  }

  /**
   * Get a single chat message by ID
   */
  async getMessage(id: string): Promise<ChatMessage> {
    this.logger.info({ messageId: id }, 'Fetching chat message');

    const message = await prisma.chatMessage.findUnique({
      where: { id },
      include: {
        session: {
          select: {
            id: true,
            agentId: true,
          },
        },
      },
    });

    if (!message) {
      throw new AppError(404, 'Chat message not found', 'MESSAGE_NOT_FOUND');
    }

    return message as unknown as ChatMessage;
  }

  /**
   * List chat messages for a session
   */
  async listMessages(params: {
    sessionId: string;
    role?: MessageRole;
    page?: number;
    limit?: number;
  }) {
    this.logger.info({ sessionId: params.sessionId }, 'Listing chat messages');

    const {
      sessionId,
      role,
      page = 1,
      limit = 100,
    } = params;

    // Verify session exists
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', 'SESSION_NOT_FOUND');
    }

    const where: any = { sessionId };

    if (role) {
      where.role = role;
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        include: {
          session: {
            select: {
              id: true,
              agentId: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chatMessage.count({ where }),
    ]);

    return {
      data: messages as unknown as ChatMessage[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a chat message
   */
  async updateMessage(id: string, data: UpdateChatMessageDTO): Promise<ChatMessage> {
    this.logger.info({ messageId: id }, 'Updating chat message');

    // Check if message exists
    await this.getMessage(id);

    const message = await prisma.chatMessage.update({
      where: { id },
      data: {
        content: data.content,
        metadata: data.metadata,
      },
      include: {
        session: {
          select: {
            id: true,
            agentId: true,
          },
        },
      },
    });

    this.logger.info({ messageId: id }, 'Chat message updated successfully');
    return message as unknown as ChatMessage;
  }

  /**
   * Delete a chat message
   */
  async deleteMessage(id: string): Promise<void> {
    this.logger.info({ messageId: id }, 'Deleting chat message');

    await this.getMessage(id);

    await prisma.chatMessage.delete({
      where: { id },
    });

    this.logger.info({ messageId: id }, 'Chat message deleted successfully');
  }

  /**
   * Get all messages for a session
   */
  async getMessagesBySession(sessionId: string): Promise<ChatMessage[]> {
    this.logger.info({ sessionId }, 'Fetching messages for session');

    // Verify session exists
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', 'SESSION_NOT_FOUND');
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      include: {
        session: {
          select: {
            id: true,
            agentId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages as unknown as ChatMessage[];
  }

  /**
   * Generate a title for a chat session based on the first user message
   * Uses a simple OpenAI API call with a focused prompt
   */
  private async generateChatTitle(userMessage: string): Promise<string> {
    this.logger.info('Attempting to generate chat title');

    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY not found, skipping title generation');
      return userMessage.substring(0, 60) + (userMessage.length > 60 ? '...' : '');
    }

    try {
      // Use a simple, fast model for title generation
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a title generator. Generate a concise, descriptive title (max 60 characters) for the following conversation starter. Only return the title, no quotes or extra text.',
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          max_tokens: 30,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error({ status: response.status, statusText: response.statusText, error: errorText }, 'OpenAI API error during title generation');
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const title = data.choices?.[0]?.message?.content?.trim();

      if (!title) {
        this.logger.warn('No title generated by OpenAI');
        throw new Error('No title generated');
      }

      const cleanTitle = title.replace(/^["']|["']$/g, ''); // Remove quotes if present
      this.logger.info({ title: cleanTitle }, 'Chat title generated successfully');
      return cleanTitle;
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate chat title');
      // Fallback: truncate the user message
      return userMessage.substring(0, 60) + (userMessage.length > 60 ? '...' : '');
    }
  }
}

export default new ChatService();

