import { prisma } from '@orchiai/database';
import { MemoryType, MemoryStrategy } from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { ProviderFactory } from '../providers/ProviderFactory';
import providerConnectionService from './ProviderConnectionService';
import memoryService from './MemoryService';

/**
 * Memory Summarizer
 * Handles memory summarization when threshold is exceeded
 */
export class MemorySummarizer {
  /**
   * Check if memory should be summarized
   * Returns true if total memory content length exceeds threshold
   */
  async shouldSummarize(agentId: string, threshold: number): Promise<boolean> {
    const memories = await prisma.memoryItem.findMany({
      where: {
        agentId,
        type: {
          in: [MemoryType.SHORT_TERM, MemoryType.LONG_TERM],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const totalLength = memories.reduce((sum: number, mem: any) => sum + mem.content.length, 0);
    return totalLength >= threshold;
  }

  /**
   * Summarize memories for an agent
   * Uses LLM to create a summary of old memories
   */
  async summarizeMemory(agentId: string): Promise<string> {
    logger.info({ agentId }, 'Starting memory summarization');

    // Get agent with model
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        model: {
          include: {
            connection: true,
          },
        },
      },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    if (!agent.model) {
      throw new AppError(400, 'Agent does not have a model configured', 'NO_MODEL_CONFIGURED');
    }

    // Get memories to summarize (exclude existing summaries)
    const memories = await prisma.memoryItem.findMany({
      where: {
        agentId,
        type: {
          in: [MemoryType.SHORT_TERM, MemoryType.LONG_TERM],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 20, // Limit to recent 20 memories for summarization
    });

    if (memories.length === 0) {
      logger.info({ agentId }, 'No memories to summarize');
      return '';
    }

    // Prepare memory content for summarization
    const memoryContent = memories
      .map((mem: any, idx: number) => `[${idx + 1}] ${mem.content}`)
      .join('\n\n');

    // Get LLM provider
    if (!agent.model.connection) {
      throw new AppError(
        400,
        'Model does not have a provider connection configured',
        'NO_CONNECTION_CONFIGURED'
      );
    }

    const apiKey = await providerConnectionService.getDecryptedApiKey(
      agent.model.connection.id
    );

    const llmProvider = ProviderFactory.create(
      agent.model.provider,
      apiKey,
      agent.model.endpoint || undefined
    );

    // Create summarization prompt
    const summaryPrompt = `Please summarize the following conversation memories into a concise summary that captures the key information, context, and important details. The summary should be useful for future conversations.

Memories to summarize:
${memoryContent}

Provide a clear, concise summary:`;

    try {
      // Call LLM for summarization
      const summaryResponse = await llmProvider.complete({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries of conversation memories.',
          },
          {
            role: 'user',
            content: summaryPrompt,
          },
        ],
        model: agent.model.modelId || 'default',
        temperature: 0.3, // Lower temperature for more consistent summaries
        maxTokens: 1000, // Limit summary length
      });

      const summary = summaryResponse.content || '';

      if (!summary) {
        throw new Error('LLM returned empty summary');
      }

      // Save summary as SUMMARY type memory
      await memoryService.createMemory({
        agentId,
        type: MemoryType.SUMMARY,
        content: summary,
        metadata: {
          summarizedCount: memories.length,
          summarizedAt: new Date().toISOString(),
        },
      });

      // Optionally: Archive or delete old SHORT_TERM memories
      // For now, we keep them but mark them as summarized in metadata
      const memoryIds = memories.map((m: any) => m.id);
      await prisma.memoryItem.updateMany({
        where: {
          id: {
            in: memoryIds,
          },
        },
        data: {
          metadata: {
            ...(memories[0].metadata as any || {}),
            summarized: true,
            summarizedAt: new Date().toISOString(),
          },
        },
      });

      logger.info({ agentId, summaryLength: summary.length, memoriesSummarized: memories.length }, 'Memory summarization completed');

      return summary;
    } catch (error: any) {
      logger.error({ agentId, error: error.message }, 'Memory summarization failed');
      throw new AppError(500, `Memory summarization failed: ${error.message}`, 'SUMMARIZATION_FAILED');
    }
  }

  /**
   * Get summarized memory context
   * Returns summary if available, otherwise returns recent memories
   */
  async getMemoryContext(agentId: string, limit: number = 10): Promise<string> {
    // First, try to get the most recent summary
    const latestSummary = await prisma.memoryItem.findFirst({
      where: {
        agentId,
        type: MemoryType.SUMMARY,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (latestSummary) {
      // Get recent memories since the summary
      const recentMemories = await prisma.memoryItem.findMany({
        where: {
          agentId,
          type: {
            in: [MemoryType.SHORT_TERM, MemoryType.LONG_TERM],
          },
          createdAt: {
            gte: latestSummary.createdAt,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      let context = `[Summary] ${latestSummary.content}\n\n`;
      if (recentMemories.length > 0) {
        context += '[Recent Memories]\n';
        context += recentMemories
          .map((mem: any) => `- ${mem.content}`)
          .join('\n');
      }

      return context;
    }

    // No summary available, return recent memories
    const memories = await prisma.memoryItem.findMany({
      where: {
        agentId,
        type: {
          in: [MemoryType.SHORT_TERM, MemoryType.LONG_TERM],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return memories.map((mem: any) => `[${mem.type}] ${mem.content}`).join('\n\n');
  }
}

export default new MemorySummarizer();

