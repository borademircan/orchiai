import { prisma } from '@orchiai/database';
import {
  RuntimeInput,
  RuntimeOutput,
  ToolCall,
  ConsultExecution,
  MemoryUpdate,
  DebugInfo,
  MemoryStrategy,
  MemoryType,
  WhenCondition,
  MessageRole,
} from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { ProviderFactory } from '../providers/ProviderFactory';
import toolExecutionEngine from './ToolExecutionEngine';
import providerConnectionService from './ProviderConnectionService';
import memoryService from './MemoryService';
import memorySummarizer from './MemorySummarizer';

/**
 * AgentRuntime Engine
 * Core orchestration engine for multi-agent execution
 */
export class AgentRuntime {
  private maxExecutionDepth = 10; // Prevent infinite loops
  private executionPath: string[] = [];
  private errors: Array<{ agentId: string; error: string; timestamp: Date }> = [];
  private streamCallback?: (event: any) => void;

  /**
   * Execute an agent with the given input
   */
  async execute(input: RuntimeInput): Promise<RuntimeOutput> {
    const startTime = Date.now();
    this.executionPath = [];
    this.errors = [];

    logger.info(
      { entryAgentId: input.entryAgentId, sessionId: input.sessionId },
      'Starting agent execution'
    );

    try {
      // Load entry agent
      const entryAgent = await this.loadAgent(input.entryAgentId);
      if (!entryAgent.isActive) {
        throw new AppError(400, 'Agent is not active', 'AGENT_NOT_ACTIVE');
      }

      // Execute the agent
      const result = await this.executeAgent(
        entryAgent.id,
        input.userMessage,
        input.sessionId,
        input.context || {},
        input.metadata || {},
        0 // depth
      );

      const executionTime = Date.now() - startTime;

      const output: RuntimeOutput = {
        finalResponse: result.response,
        toolCalls: result.toolCalls,
        consultsExecuted: result.consults,
        memoryUpdates: result.memoryUpdates,
        debugInfo: {
          totalAgentsExecuted: this.executionPath.length,
          executionPath: [...this.executionPath],
          errors: [...this.errors],
          metadata: {
            entryAgentId: input.entryAgentId,
            sessionId: input.sessionId,
            executionTimeMs: executionTime,
          },
        },
        executionTimeMs: executionTime,
      };

      logger.info(
        { entryAgentId: input.entryAgentId, executionTime },
        'Agent execution completed'
      );

      return output;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(
        { entryAgentId: input.entryAgentId, error: error.message, executionTime },
        'Agent execution failed'
      );

      throw error;
    }
  }

  /**
   * Execute an agent with streaming progress updates
   */
  async executeStream(
    input: RuntimeInput,
    onEvent: (event: any) => void
  ): Promise<void> {
    const startTime = Date.now();
    this.executionPath = [];
    this.errors = [];
    this.streamCallback = onEvent;

    onEvent({ type: 'start', message: 'Initializing agent...', timestamp: new Date().toISOString() });

    logger.info(
      { entryAgentId: input.entryAgentId, sessionId: input.sessionId },
      'Starting agent execution with streaming'
    );

    try {
      // Load entry agent
      onEvent({ type: 'loading', message: 'Loading agent configuration...', timestamp: new Date().toISOString() });
      const entryAgent = await this.loadAgent(input.entryAgentId);
      
      if (!entryAgent.isActive) {
        throw new AppError(400, 'Agent is not active', 'AGENT_NOT_ACTIVE');
      }

      onEvent({ 
        type: 'agent_loaded', 
        agent: { id: entryAgent.id, name: entryAgent.name },
        timestamp: new Date().toISOString() 
      });

      // Execute the agent
      const result = await this.executeAgent(
        entryAgent.id,
        input.userMessage,
        input.sessionId,
        input.context || {},
        input.metadata || {},
        0 // depth
      );

      const executionTime = Date.now() - startTime;

      const output: RuntimeOutput = {
        finalResponse: result.response,
        toolCalls: result.toolCalls,
        consultsExecuted: result.consults,
        memoryUpdates: result.memoryUpdates,
        debugInfo: {
          totalAgentsExecuted: this.executionPath.length,
          executionPath: [...this.executionPath],
          errors: [...this.errors],
          metadata: {
            entryAgentId: input.entryAgentId,
            sessionId: input.sessionId,
            executionTimeMs: executionTime,
          },
        },
        executionTimeMs: executionTime,
      };

      onEvent({ 
        type: 'complete', 
        result: output,
        timestamp: new Date().toISOString() 
      });

      logger.info(
        { entryAgentId: input.entryAgentId, executionTime },
        'Agent execution completed with streaming'
      );

      this.streamCallback = undefined;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(
        { entryAgentId: input.entryAgentId, error: error.message, executionTime },
        'Agent execution failed'
      );

      onEvent({ 
        type: 'error', 
        error: error.message || 'Execution failed',
        timestamp: new Date().toISOString() 
      });

      this.streamCallback = undefined;
      throw error;
    }
  }

  /**
   * Emit streaming event if callback is set
   */
  private emitEvent(event: any) {
    if (this.streamCallback) {
      this.streamCallback({ ...event, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Execute a single agent
   */
  private async executeAgent(
    agentId: string,
    userMessage: string,
    sessionId: string | undefined,
    context: Record<string, any>,
    metadata: Record<string, any>,
    depth: number
  ): Promise<{
    response: string;
    toolCalls: ToolCall[];
    consults: ConsultExecution[];
    memoryUpdates: MemoryUpdate[];
  }> {
    // Prevent infinite loops
    if (depth >= this.maxExecutionDepth) {
      throw new AppError(500, 'Maximum execution depth reached', 'MAX_DEPTH_EXCEEDED');
    }

    // Track execution path
    this.executionPath.push(agentId);

    // Load agent with all relations
    const agent = await this.loadAgentWithRelations(agentId);

    // Retrieve relevant memory
    const memoryContext = await this.retrieveMemory(agent, userMessage, sessionId);

    // Build message history
    const messages = this.buildMessageHistory(
      agent,
      userMessage,
      memoryContext,
      context
    );

    // Get LLM provider
    const llmProvider = await this.getLLMProvider(agent);

    // Prepare tools for LLM
    const tools = await this.prepareTools(agent);

    // Call LLM
    this.emitEvent({ 
      type: 'llm_call', 
      message: `Calling LLM (${agent.model?.modelId || 'default'})...`,
      agent: { id: agent.id, name: agent.name }
    });
    
    const llmResponse = await llmProvider.complete({
      messages,
      model: agent.model?.modelId || 'default',
      temperature: agent.model?.temperature || 0.7,
      maxTokens: agent.model?.maxTokens || 4000,
      tools: tools.length > 0 ? tools : undefined,
    });

    // Extract response and tool calls
    let response = llmResponse.content || '';
    const toolCalls: ToolCall[] = [];
    const consults: ConsultExecution[] = [];
    const memoryUpdates: MemoryUpdate[] = [];

    this.emitEvent({ 
      type: 'llm_response', 
      message: 'Received LLM response',
      response: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
      agent: { id: agent.id, name: agent.name }
    });

    // Handle tool calls if present
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const toolCall of llmResponse.toolCalls) {
        this.emitEvent({ 
          type: 'tool_call', 
          message: `Executing tool: ${toolCall.name}`,
          tool: toolCall.name,
          parameters: toolCall.arguments
        });
        
        const toolResult = await this.executeToolCall(agent, toolCall);
        toolCalls.push(toolResult);
        
        this.emitEvent({ 
          type: 'tool_result', 
          message: `Tool ${toolCall.name} completed`,
          tool: toolCall.name,
          success: !toolResult.error,
          result: toolResult.error ? toolResult.error : 'Success'
        });

        // Add tool result to messages for next LLM call if needed
        if (toolResult.result) {
          messages.push({
            role: MessageRole.TOOL,
            content: JSON.stringify(toolResult.result),
          });
        }
      }

      // If tools were called, make another LLM call with tool results
      if (toolCalls.length > 0 && toolCalls.some(tc => tc.result)) {
        const followUpResponse = await llmProvider.complete({
          messages: [
            ...messages,
            {
              role: MessageRole.ASSISTANT,
              content: response,
            },
          ],
          model: agent.model?.modelId || 'default',
          temperature: agent.model?.temperature || 0.7,
          maxTokens: agent.model?.maxTokens || 4000,
        });

        response = followUpResponse.content || response;
      }
    }

    // Handle consult rules (multi-agent orchestration)
    const consultResults = await this.handleConsults(
      agent,
      response,
      userMessage,
      sessionId,
      context,
      metadata,
      depth
    );
    consults.push(...consultResults);

    // Handle memory updates
    const memoryResults = await this.handleMemory(
      agent,
      userMessage,
      response,
      sessionId,
      memoryContext
    );
    memoryUpdates.push(...memoryResults);

    return {
      response,
      toolCalls,
      consults,
      memoryUpdates,
    };
  }

  /**
   * Load agent with basic info
   */
  private async loadAgent(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    return agent;
  }

  /**
   * Load agent with all relations needed for execution
   */
  private async loadAgentWithRelations(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        model: {
          include: {
            connection: true,
          },
        },
        tools: {
          include: {
            tool: true,
          },
        },
        consultRules: {
          include: {
            consultedAgent: {
              include: {
                model: {
                  include: {
                    connection: true,
                  },
                },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    return agent;
  }

  /**
   * Retrieve relevant memory for the agent
   */
  private async retrieveMemory(
    agent: any,
    userMessage: string,
    sessionId: string | undefined
  ): Promise<string> {
    // Use memory summarizer to get context (includes summaries if available)
    return memorySummarizer.getMemoryContext(agent.id, 10);
  }

  /**
   * Build message history for LLM
   */
  private buildMessageHistory(
    agent: any,
    userMessage: string,
    memoryContext: string,
    context: Record<string, any>
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // System message with instructions
    let systemContent = agent.instructions;
    
    // Add behavioral context for specialist agents
    if (context.isConsultation) {
      systemContent += `\n\n============================================================
CONSULTATION CONTEXT
============================================================

You are being consulted as a specialist agent in a ${context.orchestrationMode || 'FLOW'} workflow.

KEY BEHAVIORS:
• Provide direct, actionable insights in your area of expertise
• Be concise yet comprehensive (aim for clarity over length)
• Reference previous consultations if building on their work
• Don't ask for information that was already provided by other agents
• Stay focused on your specialty - don't try to cover other agents' domains

${context.autoMode ? '• This is AUTO MODE: Provide complete response, no user interaction expected' : '• This is MANUAL MODE: User will review your response before proceeding'}
============================================================
`;
    }
    
    if (memoryContext) {
      systemContent += `\n\nRelevant Memory:\n${memoryContext}`;
    }
    
    // Format conversation history from previous consultations
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      systemContent += '\n\n## Previous Agent Consultations:';
      for (const consult of context.conversationHistory) {
        systemContent += `\n\n**${consult.agent}:** ${consult.response}`;
      }
      systemContent += '\n\n---\nUse the insights above to inform your response. Build upon what has already been discussed rather than asking for information that was already provided.';
    }
    
    // Add user's original message if available
    if (context.userMessage && context.userMessage !== userMessage) {
      systemContent += `\n\n## User's Original Request:\n${context.userMessage}`;
    }
    
    // Add any other context
    const otherContext = { ...context };
    delete otherContext.conversationHistory;
    delete otherContext.userMessage;
    delete otherContext.previousConsultations;
    
    if (Object.keys(otherContext).length > 0) {
      systemContent += `\n\n## Additional Context:\n${JSON.stringify(otherContext, null, 2)}`;
    }

    messages.push({
      role: MessageRole.SYSTEM,
      content: systemContent,
    });

    // User message (current question)
    messages.push({
      role: MessageRole.USER,
      content: userMessage,
    });

    return messages;
  }

  /**
   * Get LLM provider instance
   */
  private async getLLMProvider(agent: any) {
    if (!agent.model) {
      throw new AppError(400, 'Agent does not have a model configured', 'NO_MODEL_CONFIGURED');
    }

    if (!agent.model.connection) {
      throw new AppError(
        400,
        'Model does not have a provider connection configured',
        'NO_CONNECTION_CONFIGURED'
      );
    }

    // Get decrypted API key
    const apiKey = await providerConnectionService.getDecryptedApiKey(
      agent.model.connection.id
    );

    // Create provider instance
    return ProviderFactory.create(
      agent.model.provider,
      apiKey,
      agent.model.endpoint || undefined
    );
  }

  /**
   * Prepare tools for LLM
   */
  private async prepareTools(agent: any): Promise<any[]> {
    const tools: any[] = [];

    for (const agentTool of agent.tools || []) {
      const tool = agentTool.tool;
      if (!tool.isActive) continue;

      // Convert tool schema to OpenAI function format
      tools.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.schema,
        },
      });
    }

    return tools;
  }

  /**
   * Execute a tool call
   */
  private async executeToolCall(agent: any, toolCall: any): Promise<ToolCall> {
    try {
      // Find the tool by name
      const agentTool = agent.tools?.find(
        (at: any) => at.tool.name === toolCall.function?.name
      );

      if (!agentTool) {
        return {
          toolId: '',
          toolName: toolCall.function?.name || 'unknown',
          parameters: toolCall.function?.arguments || {},
          error: 'Tool not found',
        };
      }

      const tool = agentTool.tool;
      const parameters =
        typeof toolCall.function?.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function?.arguments || {};

      // Execute the tool
      const result = await toolExecutionEngine.executeTool(tool, parameters);

      return {
        toolId: tool.id,
        toolName: tool.name,
        parameters,
        result: result.success ? result.data : undefined,
        error: result.success ? undefined : result.error,
      };
    } catch (error: any) {
      return {
        toolId: '',
        toolName: toolCall.function?.name || 'unknown',
        parameters: toolCall.function?.arguments || {},
        error: error.message || 'Tool execution failed',
      };
    }
  }

  /**
   * Handle consult rules (multi-agent orchestration)
   */
  private async handleConsults(
    agent: any,
    response: string,
    userMessage: string,
    sessionId: string | undefined,
    context: Record<string, any>,
    metadata: Record<string, any>,
    depth: number
  ): Promise<ConsultExecution[]> {
    const consults: ConsultExecution[] = [];

    if (!agent.consultRules || agent.consultRules.length === 0) {
      return consults;
    }

    for (const consultRule of agent.consultRules) {
      // Check if consult should be executed
      const shouldConsult = this.shouldConsult(consultRule, response, userMessage, context);

      if (!shouldConsult) {
        continue;
      }

      try {
        const consultStartTime = Date.now();

        // Build the prompt to send to the consulted agent
        const consultPrompt = `${consultRule.purpose}\n\nContext: ${response}\n\nUser Message: ${userMessage}`;

        this.emitEvent({ 
          type: 'consult_start', 
          message: `Consulting ${consultRule.consultedAgent.name}...`,
          consultedAgent: { 
            id: consultRule.consultedAgent.id, 
            name: consultRule.consultedAgent.name 
          },
          purpose: consultRule.purpose,
          prompt: consultPrompt
        });

        // Execute consulted agent
        const consultResult = await this.executeAgent(
          consultRule.consultedAgent.id,
          consultPrompt,
          sessionId,
          context,
          metadata,
          depth + 1
        );

        const consultExecutionTime = Date.now() - consultStartTime;

        this.emitEvent({ 
          type: 'consult_complete', 
          message: `${consultRule.consultedAgent.name} completed`,
          consultedAgent: { 
            id: consultRule.consultedAgent.id, 
            name: consultRule.consultedAgent.name 
          },
          prompt: consultPrompt,
          response: consultResult.response,
          fullResponse: consultResult.response,
          executionTimeMs: consultExecutionTime
        });

        consults.push({
          agentId: consultRule.consultedAgent.id,
          agentName: consultRule.consultedAgent.name,
          purpose: consultRule.purpose,
          response: consultResult.response,
          toolCalls: consultResult.toolCalls,
          executionTimeMs: consultExecutionTime,
        });
      } catch (error: any) {
        this.errors.push({
          agentId: consultRule.consultedAgent.id,
          error: error.message || 'Consult execution failed',
          timestamp: new Date(),
        });
        logger.error(
          { consultRuleId: consultRule.id, error: error.message },
          'Consult execution failed'
        );
      }
    }

    return consults;
  }

  /**
   * Determine if a consult should be executed
   */
  private shouldConsult(
    consultRule: any,
    response: string,
    userMessage: string,
    context: Record<string, any>
  ): boolean {
    switch (consultRule.whenCondition) {
      case WhenCondition.ALWAYS:
        // Always consult when rule is set to ALWAYS
        return true;

      case WhenCondition.ONLY_IF_NEEDED:
        // Check if response contains uncertainty indicators
        const uncertaintyIndicators = ['not sure', 'uncertain', 'don\'t know', 'unclear', 'might need', 'should consult'];
        return uncertaintyIndicators.some(indicator =>
          response.toLowerCase().includes(indicator)
        );

      case WhenCondition.CONDITIONAL:
        // Evaluate conditional rule (simple string matching for now)
        if (!consultRule.conditionalRule) {
          return false;
        }
        // Simple keyword matching
        const rule = consultRule.conditionalRule.toLowerCase();
        return (
          response.toLowerCase().includes(rule) ||
          userMessage.toLowerCase().includes(rule)
        );

      default:
        return false;
    }
  }

  /**
   * Check if a consultation is relevant to the current context
   * Uses dynamic keyword extraction from agent's instructions and purpose
   * VERY STRICT matching to avoid false positives
   */
  private isRelevantToContext(
    consultRule: any,
    userMessage: string,
    response: string
  ): boolean {
    const agentName = consultRule.consultedAgent.name?.toLowerCase() || '';
    const agentInstructions = consultRule.consultedAgent.instructions?.toLowerCase() || '';
    const purpose = consultRule.purpose.toLowerCase();
    const message = userMessage.toLowerCase();
    const resp = response.toLowerCase();

    // Check if agent name is explicitly mentioned (strong signal)
    const agentNameKeywords = agentName.replace(/agent/g, '').trim().split(/\s+/);
    const isAgentNamedInMessage = agentNameKeywords.some(keyword => 
      keyword.length > 3 && (message.includes(keyword) || resp.includes(keyword))
    );

    if (isAgentNamedInMessage) {
      this.emitEvent({ 
        type: 'debug', 
        message: `✓ ${consultRule.consultedAgent.name}: Matched by name mention` 
      });
      return true;
    }

    // Extract domain-specific keywords (first 150 chars of instructions)
    const keyInstructions = agentInstructions.substring(0, 150);
    const domainKeywords = this.extractKeywords(keyInstructions)
      .filter(w => w.length > 6); // Only longer, more specific words (increased from 5 to 6)

    // Extract purpose keywords
    const purposeKeywords = this.extractKeywords(purpose)
      .filter(w => w.length > 6);

    // Combine and deduplicate
    const allKeywords = [...new Set([...domainKeywords, ...purposeKeywords])];

    // Count keyword matches ONLY in user message (not in LLM response)
    const matchedKeywords = allKeywords.filter(keyword => 
      message.includes(keyword)
    );

    // MUCH STRICTER RULES:
    // 1. Very specific match (>10 chars) - single highly specific keyword
    // 2. Multiple strong matches (3+ keywords of 7+ chars each)
    // 3. Strong semantic match (2+ keywords of 9+ chars each)
    const verySpecificMatch = matchedKeywords.some(k => k.length > 10);
    const multipleStrongMatches = matchedKeywords.filter(k => k.length >= 7).length >= 3;
    const strongSemanticMatch = matchedKeywords.filter(k => k.length >= 9).length >= 2;

    if (verySpecificMatch || multipleStrongMatches || strongSemanticMatch) {
      this.emitEvent({ 
        type: 'debug', 
        message: `✓ ${consultRule.consultedAgent.name}: Matched - ${matchedKeywords.slice(0, 3).join(', ')}` 
      });
      return true;
    }

    // No match
    this.emitEvent({ 
      type: 'debug', 
      message: `✗ ${consultRule.consultedAgent.name}: No match (found: ${matchedKeywords.join(', ') || 'none'})` 
    });
    return false;
  }

  /**
   * Extract meaningful keywords from text (nouns, verbs, domain-specific terms)
   */
  private extractKeywords(text: string): string[] {
    // Remove common stop words and extract meaningful terms
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !this.isStopWord(w));

    // Remove duplicates and return unique keywords
    return [...new Set(words)];
  }

  /**
   * Check if a word is a common stop word (articles, pronouns, common verbs)
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was',
      'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may',
      'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'too', 'use',
      'this', 'that', 'with', 'have', 'from', 'they', 'will', 'what', 'been', 'more',
      'when', 'your', 'some', 'than', 'into', 'very', 'them', 'then', 'these', 'their',
      'about', 'would', 'there', 'could', 'other', 'which', 'should', 'being', 'through',
      'help', 'user', 'provide', 'support', 'offer', 'focus', 'work', 'make', 'take',
      'give', 'find', 'tell', 'call', 'first', 'last', 'long', 'great', 'little', 'good'
    ]);
    return stopWords.has(word);
  }

  /**
   * Handle memory updates
   */
  private async handleMemory(
    agent: any,
    userMessage: string,
    response: string,
    sessionId: string | undefined,
    existingMemory: string
  ): Promise<MemoryUpdate[]> {
    const updates: MemoryUpdate[] = [];

    // Skip if memory strategy is MANUAL_ONLY
    if (agent.memoryStrategy === MemoryStrategy.MANUAL_ONLY) {
      return updates;
    }

    // Handle ASK_USER strategy (only for chat triggers)
    if (agent.memoryStrategy === MemoryStrategy.ASK_USER) {
      // For ASK_USER, we mark the memory as pending user approval
      // The actual saving would happen after user confirms
      // For now, we'll include it in the response for the user to approve
      updates.push({
        type: MemoryType.SHORT_TERM,
        content: `User: ${userMessage}\nAssistant: ${response}`,
        saved: false,
        reason: 'Pending user approval (ASK_USER strategy)',
      });
      return updates;
    }

    // Handle AUTO strategy
    if (agent.memoryStrategy === MemoryStrategy.AUTO) {
      // Check if memory threshold is exceeded
      const shouldSummarize = await memorySummarizer.shouldSummarize(
        agent.id,
        agent.memoryThreshold
      );

      if (shouldSummarize) {
        try {
          // Summarize existing memories
          const summary = await memorySummarizer.summarizeMemory(agent.id);
          updates.push({
            type: MemoryType.SUMMARY,
            content: summary,
            saved: true,
            reason: 'Memory threshold exceeded, summarized old memories',
          });
        } catch (error: any) {
          logger.error({ agentId: agent.id, error: error.message }, 'Memory summarization failed');
          // Continue with saving new memory even if summarization fails
        }
      }

      // Determine if new memory should be saved
      const shouldSave = this.shouldSaveMemory(agent, userMessage, response, existingMemory);

      if (shouldSave) {
        try {
          // Create memory item
          await memoryService.createMemory({
            agentId: agent.id,
            type: MemoryType.SHORT_TERM,
            content: `User: ${userMessage}\nAssistant: ${response}`,
          });

          updates.push({
            type: MemoryType.SHORT_TERM,
            content: `User: ${userMessage}\nAssistant: ${response}`,
            saved: true,
            reason: 'Auto-saved based on memory strategy',
          });
        } catch (error: any) {
          updates.push({
            type: MemoryType.SHORT_TERM,
            content: `User: ${userMessage}\nAssistant: ${response}`,
            saved: false,
            reason: error.message || 'Failed to save memory',
          });
        }
      }
    }

    return updates;
  }

  /**
   * Determine if memory should be saved
   */
  private shouldSaveMemory(
    agent: any,
    userMessage: string,
    response: string,
    existingMemory: string
  ): boolean {
    // Save if conversation is meaningful (simple heuristic)
    // Can be enhanced with more sophisticated logic
    return userMessage.length > 10 && response.length > 10;
  }

  /**
   * FRONTEND-DRIVEN ORCHESTRATION METHODS
   * These methods allow the frontend to orchestrate consultations step-by-step
   */

  /**
   * Step 1: Plan which agents to consult
   * Returns a list of consultation tasks without executing them
   */
  async planConsultations(input: RuntimeInput): Promise<{
    consultations: Array<{
      agentId: string;
      agentName: string;
      purpose: string;
      priority: number;
    }>;
    context: Record<string, any>;
  }> {
    logger.info({ entryAgentId: input.entryAgentId }, 'Planning consultations');

    // Load entry agent with consult rules
    const agent = await this.loadAgentWithRelations(input.entryAgentId);

    if (!agent.isActive) {
      throw new AppError(400, 'Agent is not active', 'AGENT_NOT_ACTIVE');
    }

    // Retrieve memory context
    const memoryContext = await this.retrieveMemory(agent, input.userMessage, input.sessionId);

    // Check if this is a follow-up question that doesn't need consultations
    const isFollowUp = input.conversationHistory && input.conversationHistory.length > 2; // More than just first user message + first response
    
    if (isFollowUp) {
      logger.info('Detected follow-up message, checking if consultations needed');
      
      // Use LLM to determine if full orchestration is needed
      const llmProvider = await this.getLLMProvider(agent);
      
      const analysisPrompt = `You are analyzing whether a user's follow-up message requires consulting specialist agents or if it can be answered directly.

Conversation History:
${input.conversationHistory?.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}

New User Message: ${input.userMessage}

Analyze if this message:
1. Is a simple follow-up, clarification, or refinement request about the previous conversation
2. Or is a NEW task/request that would benefit from consulting specialist agents again

Respond with ONLY one word:
- "DIRECT" if you can answer this follow-up directly without consulting other agents
- "CONSULT" if this requires consulting specialist agents (it's a significantly new request)`;

      try {
        const analysisResponse = await llmProvider.complete({
          messages: [{ role: 'user', content: analysisPrompt }],
          model: agent.model?.modelId || 'default',
          temperature: 0.3,
          maxTokens: 10,
        });

        const decision = analysisResponse.content.trim().toUpperCase();
        logger.info({ decision }, 'Follow-up analysis decision');

        if (decision.includes('DIRECT')) {
          logger.info('Follow-up can be answered directly, skipping consultations');
          return {
            consultations: [],
            context: {
              ...input.context,
              memory: memoryContext,
              isFollowUp: true,
              conversationHistory: input.conversationHistory,
            },
          };
        }
      } catch (error) {
        logger.error({ error }, 'Failed to analyze follow-up, proceeding with consultations');
      }
    }

    // Build the consultation plan
    const consultations: Array<{
      agentId: string;
      agentName: string;
      purpose: string;
      priority: number;
    }> = [];

    for (const rule of agent.consultRules || []) {
      if (!rule.consultedAgent) continue;

      const shouldConsult = await this.shouldConsult(
        rule,
        input.userMessage,
        '',
        input.context || {},
        rule.consultedAgent.instructions,
        rule.purpose || 'General consultation'
      );

      if (shouldConsult) {
        consultations.push({
          agentId: rule.consultedAgent.id,
          agentName: rule.consultedAgent.name,
          purpose: rule.purpose || 'General consultation',
          priority: rule.priority || 0,
        });
      }
    }

    // Sort by priority (highest first)
    consultations.sort((a, b) => b.priority - a.priority);

    return {
      consultations,
      context: {
        ...input.context,
        memory: memoryContext,
      },
    };
  }

  /**
   * Step 2: Execute a single consultation
   * Runs one specialist agent with a specific question
   */
  async executeConsultation(params: {
    agentId: string;
    question: string;
    context: Record<string, any>;
    sessionId?: string;
  }): Promise<{
    agentId: string;
    agentName: string;
    response: string;
    toolCalls: ToolCall[];
  }> {
    logger.info({ agentId: params.agentId }, 'Executing consultation');

    // Load the specialist agent
    const agent = await this.loadAgentWithRelations(params.agentId);

    if (!agent.isActive) {
      throw new AppError(400, 'Agent is not active', 'AGENT_NOT_ACTIVE');
    }

    // Retrieve memory for this agent
    const memoryContext = await this.retrieveMemory(agent, params.question, params.sessionId);

    // Build messages with consultation context
    const enrichedContext = {
      ...params.context,
      isConsultation: true,
      orchestrationMode: params.context.orchestrationMode || 'FLOW',
      autoMode: params.context.autoMode || false,
    };

    const messages = this.buildMessageHistory(
      agent,
      params.question,
      memoryContext,
      enrichedContext
    );

    // Get LLM provider
    const llmProvider = await this.getLLMProvider(agent);

    // Prepare tools
    const tools = await this.prepareTools(agent);

    // Call LLM
    const llmResponse = await llmProvider.complete({
      messages,
      model: agent.model?.modelId || 'default',
      temperature: agent.model?.temperature || 0.7,
      maxTokens: agent.model?.maxTokens || 4000,
      tools: tools.length > 0 ? tools : undefined,
    });

    const response = llmResponse.content || '';
    const toolCalls: ToolCall[] = [];

    // Execute tool calls if any
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const toolCall of llmResponse.toolCalls) {
        const tool = agent.tools?.find(
          (t) => t.tool.name === toolCall.function.name
        );

        if (tool) {
          let parameters: Record<string, any> = {};
          try {
            parameters = JSON.parse(toolCall.function.arguments);
          } catch (error) {
            logger.error({ error }, 'Failed to parse tool arguments');
          }

          const result = await toolExecutionEngine.executeTool(tool.tool, parameters);
          toolCalls.push({
            toolId: tool.tool.id,
            toolName: tool.tool.name,
            parameters,
            result,
          });
        }
      }
    }

    return {
      agentId: agent.id,
      agentName: agent.name,
      response,
      toolCalls,
    };
  }

  /**
   * Step 3: Synthesize final response
   * Combines all consultation results into a final answer
   */
  async synthesizeFinalResponse(params: {
    agentId: string;
    userMessage: string;
    consultations: Array<{
      agentName: string;
      purpose: string;
      response: string;
    }>;
    context: Record<string, any>;
    sessionId?: string;
  }): Promise<{
    finalResponse: string;
    debugInfo: any;
  }> {
    logger.info({ agentId: params.agentId, consultationsCount: params.consultations.length }, 'Synthesizing final response');

    // Load the orchestrator agent
    const agent = await this.loadAgentWithRelations(params.agentId);

    let messages: Array<{ role: MessageRole; content: string }>;

    // Check if this is a follow-up (no consultations needed)
    const isFollowUp = params.consultations.length === 0 && params.context?.isFollowUp;

    if (isFollowUp && params.context?.conversationHistory) {
      logger.info('Handling follow-up question with conversation history');
      
      // Build messages with full conversation history
      messages = [
        {
          role: 'system' as MessageRole,
          content: agent.instructions,
        },
        // Add recent conversation history (last 8 messages for context)
        ...params.context.conversationHistory.slice(-8).map((msg: any) => ({
          role: msg.role.toLowerCase() as MessageRole,
          content: msg.content,
        })),
      ];
    } else if (params.consultations.length > 0) {
      // Build consultation summary for context
      const consultationSummary = params.consultations
        .map(
          (c, i) =>
            `\n\n### Consultation ${i + 1}: ${c.agentName}\n**Purpose:** ${c.purpose}\n**Response:** ${c.response}`
        )
        .join('\n');

      // Build messages with consultation context
      messages = [
        {
          role: 'system' as MessageRole,
          content: `${agent.instructions}\n\n## Consultation Results\nYou consulted with ${params.consultations.length} specialist(s). Here are their responses:${consultationSummary}\n\nNow synthesize these insights into a comprehensive, well-structured response for the user.`,
        },
        {
          role: 'user' as MessageRole,
          content: params.userMessage,
        },
      ];
    } else {
      // Fallback: just use user message
      messages = [
        {
          role: 'system' as MessageRole,
          content: agent.instructions,
        },
        {
          role: 'user' as MessageRole,
          content: params.userMessage,
        },
      ];
    }

    // Get LLM provider
    const llmProvider = await this.getLLMProvider(agent);

    // Call LLM for final response
    const llmResponse = await llmProvider.complete({
      messages,
      model: agent.model?.modelId || 'default',
      temperature: agent.model?.temperature || 0.7,
      maxTokens: agent.model?.maxTokens || 4000,
    });

    return {
      finalResponse: llmResponse.content || '',
      debugInfo: {
        consultationsCount: params.consultations.length,
        consultedAgents: params.consultations.map((c) => c.agentName),
        isFollowUp,
      },
    };
  }
  /**
   * Parse @mention from user message
   */
  private parseMentionedAgent(message: string): {
    mentionedAgentName?: string;
    cleanedMessage: string;
    isMention: boolean;
  } {
    const mentionRegex = /@(\w+)\s+(.+)/s;
    const match = message.match(mentionRegex);
    
    if (match) {
      return {
        mentionedAgentName: match[1],
        cleanedMessage: match[2].trim(),
        isMention: true,
      };
    }
    
    return {
      cleanedMessage: message.trim(),
      isMention: false,
    };
  }

  /**
   * Generate orchestrator message with agent mention
   */
  private async generateOrchestratorMessage(params: {
    agent: any;
    userMessage: string;
    consultation: { agentName: string; agentId: string; purpose: string };
    mode: string;
    autoMode: boolean;
  }): Promise<{ acknowledgement: string; agentPrompt: string }> {
    // Generate acknowledgement and detailed agent prompt
    const acknowledgement = `Great question! Let me dive deep into this and create a comprehensive analysis. I'll consult the ${params.consultation.agentName} to gather expert insights.`;

    // Create detailed mastermind-style prompt for the specialist agent
    const agentPrompt = `@${params.consultation.agentName} Mastermind Request:

The user asked: "${params.userMessage}"

Purpose: ${params.consultation.purpose}

Please provide a comprehensive response that includes:

1. **Key Insights**: What are the top 3-5 most important points related to this question?
2. **Detailed Analysis**: Deep dive into each point with specific examples and data
3. **Actionable Recommendations**: What concrete steps or actions should be taken?
4. **Opportunities**: What specific opportunities or angles should be explored?
5. **Critical Considerations**: What risks, challenges, or important factors must be considered?

Make your response thorough, insightful, and actionable.`;

    logger.info({
      agentName: params.consultation.agentName,
      userMessage: params.userMessage,
      acknowledgement: acknowledgement.substring(0, 100),
      agentPromptLength: agentPrompt.length
    }, 'Generated orchestrator message');

    return {
      acknowledgement,
      agentPrompt,
    };
  }

  /**
   * Generate orchestrator conversational prompt
   */
  private async generateOrchestratorPrompt(params: {
    agent: any;
    currentStep: string;
    completedConsultations: string[];
    remainingConsultations: string[];
    mode: string;
    autoMode: boolean;
  }): Promise<string | null> {
    // If auto mode, skip orchestrator prompts
    if (params.autoMode) {
      return null;
    }

    const llmProvider = await this.getLLMProvider(params.agent);
    
    // Comprehensive behavioral instructions
    const behavioralRules = `
============================================================
ORCHESTRATOR BEHAVIORAL RULES
============================================================

CURRENT CONFIGURATION:
• Mode: ${params.mode === 'FLOW' ? 'FLOW (Structured Workflow)' : 'Q&A (Free-form Conversation)'}
• Auto Mode: ${params.autoMode ? 'ON (Full Auto)' : 'OFF (Manual/Conversational)'}

------------------------------------------------------------
1. AUTO MODE: ${params.autoMode ? 'ON' : 'OFF'}
------------------------------------------------------------

${!params.autoMode ? `
→ USER-MANUAL MODE (AUTO MODE OFF):
  ✓ After ANY agent sends a response, STOP immediately
  ✓ Wait for user's explicit direction
  ✓ Ask: "Would you like to continue to the next step?"
  ✓ NEVER proceed to next agent automatically
  ✓ NEVER make decisions on behalf of the user
  ✓ Always pause and seek user confirmation before proceeding
  ✓ Be conversational and helpful, not robotic
` : `
→ FULL AUTO MODE (AUTO MODE ON):
  ✓ Execute all consultations automatically
  ✓ No pausing between steps
  ✓ No asking for permission
  ✓ Complete the entire workflow in one go
  ✓ Only provide final synthesized result
`}

------------------------------------------------------------
2. ORCHESTRATION MODE: ${params.mode}
------------------------------------------------------------

${params.mode === 'FLOW' ? `
→ FLOW MODE (Structured Workflow):
  ✓ Guide user through defined steps sequentially
  ✓ Ask guiding questions at each checkpoint
  ✓ Suggest the next logical step in the workflow
  ✓ Keep user aware of progress and remaining steps
  ✓ Example: "We've consulted ${params.completedConsultations[0] || 'the first agent'}. Should we proceed to ${params.remainingConsultations[0] || 'finalize'}?"
` : `
→ Q&A MODE (Free-form Conversation):
  ✓ Free-form, non-linear conversation
  ✓ Agents respond to direct questions as they come
  ✓ No predefined workflow structure
  ✓ Allow topic switching and exploration
  ✓ Example: "Does this answer your question? Would you like to explore anything else?"
`}

------------------------------------------------------------
3. @MENTION HANDLING
------------------------------------------------------------

When user uses @AgentName syntax:
  ✓ Route ONLY to that specific agent
  ✓ Don't involve other agents unless explicitly requested
  ✓ After response, ask: "Would you like insights from other agents too?"
  ✓ Respect user's direct routing intentions
`;
    
    const promptContext = params.mode === 'FLOW' 
      ? `You are an orchestrator managing a structured workflow.

${behavioralRules}

CURRENT PROGRESS:
• Completed consultations: ${params.completedConsultations.join(', ') || 'None yet'}
• Remaining consultations: ${params.remainingConsultations.join(', ') || 'None - all complete'}

Your task: Generate a natural, brief question to guide the user. Consider:
- Should they elaborate on any point?
- Ready to move to the next step?
- Need more details from a specific agent?

Keep it conversational and under 2 sentences. Follow the behavioral rules above.`
      : `You are facilitating a Q&A session with specialist agents.

${behavioralRules}

CURRENT STATUS:
• Agents consulted: ${params.completedConsultations.join(', ') || 'None yet'}

Your task: Ask the user if they have more questions or need clarification. Keep it brief and conversational (1-2 sentences). Follow the behavioral rules above.`;

    try {
      const response = await llmProvider.complete({
        messages: [
          { role: 'system', content: promptContext },
          { role: 'user', content: 'Generate the orchestrator question now.' },
        ],
        model: params.agent.model?.modelId || 'default',
        temperature: 0.7,
        maxTokens: 100,
      });

      return response.content.trim();
    } catch (error) {
      logger.error({ error }, 'Failed to generate orchestrator prompt');
      // Fallback prompt
      if (params.remainingConsultations.length > 0) {
        return `Should we proceed to ${params.remainingConsultations[0]} for their input, or would you like to discuss any of the points raised so far?`;
      } else {
        return `We've gathered all the specialist insights. Should I synthesize this into a comprehensive response?`;
      }
    }
  }

  /**
   * Handle conversational message (main entry point for new flow)
   */
  async handleConversationalMessage(params: {
    message: string;
    sessionId: string;
    agentId: string;
    conversationHistory: Array<{
      role: string;
      content: string;
      metadata?: Record<string, any>;
    }>;
    autoMode: boolean;
    orchestrationMode?: 'FLOW' | 'QA';
  }): Promise<{
    messages: Array<{
      role: string;
      content: string;
      metadata?: Record<string, any>;
    }>;
    requiresUserResponse: boolean;
  }> {
    logger.info({ agentId: params.agentId, orchestrationMode: params.orchestrationMode }, 'Handling conversational message');

    // Save user message to database FIRST
    await prisma.chatMessage.create({
      data: {
        sessionId: params.sessionId,
        role: 'USER',
        content: params.message,
        metadata: {},
      },
    });

    logger.info('User message saved to database');

    // Load agent
    const agent = await this.loadAgentWithRelations(params.agentId);

    if (!agent.isActive) {
      throw new AppError(400, 'Agent is not active', 'AGENT_NOT_ACTIVE');
    }

    // Use provided orchestrationMode or fall back to agent's default
    const orchestrationMode = params.orchestrationMode || agent.orchestrationMode || 'FLOW';

    // Parse @mention
    const { mentionedAgentName, cleanedMessage, isMention } = this.parseMentionedAgent(params.message);

    // If @mention, route directly to that agent
    if (isMention && mentionedAgentName) {
      return this.routeToSpecificAgent({
        agentName: mentionedAgentName,
        message: cleanedMessage,
        orchestratorAgent: agent,
        sessionId: params.sessionId,
        conversationHistory: params.conversationHistory,
        autoMode: params.autoMode,
      });
    }

    // Otherwise, handle based on orchestration mode
    if (orchestrationMode === 'QA') {
      return this.handleQAMode({
        agent,
        message: params.message,
        sessionId: params.sessionId,
        conversationHistory: params.conversationHistory,
        autoMode: params.autoMode,
      });
    } else {
      return this.handleFlowMode({
        agent,
        message: params.message,
        sessionId: params.sessionId,
        conversationHistory: params.conversationHistory,
        autoMode: params.autoMode,
      });
    }
  }

  /**
   * Route message to specific agent via @mention
   */
  private async routeToSpecificAgent(params: {
    agentName: string;
    message: string;
    orchestratorAgent: any;
    sessionId: string;
    conversationHistory: any[];
    autoMode: boolean;
  }): Promise<any> {
    logger.info({ agentName: params.agentName }, 'Routing to specific agent via @mention');

    // Find the mentioned agent
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      include: {
        model: true,
        tools: {
          include: { tool: true },
        },
      },
    });

    const targetAgent = agents.find(
      a => a.name.toLowerCase() === params.agentName.toLowerCase()
    );

    if (!targetAgent) {
      return {
        messages: [{
          role: 'ASSISTANT',
          content: `I couldn't find an agent named "${params.agentName}". Available agents: ${agents.map(a => a.name).join(', ')}`,
          metadata: { error: true },
        }],
        requiresUserResponse: true,
      };
    }

    // Execute consultation with the specific agent
    const result = await this.executeConsultation({
      agentId: targetAgent.id,
      question: params.message,
      context: { 
        conversationHistory: params.conversationHistory,
        orchestrationMode: params.orchestratorAgent.orchestrationMode || 'FLOW',
        autoMode: params.autoMode,
      },
      sessionId: params.sessionId,
    });

    const messages = [
      {
        role: 'ASSISTANT',
        content: result.response,
        metadata: {
          agentName: targetAgent.name,
          isMentionResponse: true,
        },
      },
    ];

    // Add orchestrator follow-up if not auto mode
    if (!params.autoMode) {
      const orchestratorPrompt = await this.generateOrchestratorPrompt({
        agent: params.orchestratorAgent,
        currentStep: 'mentioned_agent_responded',
        completedConsultations: [targetAgent.name],
        remainingConsultations: [],
        mode: params.orchestratorAgent.orchestrationMode,
        autoMode: params.autoMode,
      });

      if (orchestratorPrompt) {
        messages.push({
          role: 'ASSISTANT',
          content: orchestratorPrompt,
          metadata: {
            agentName: params.orchestratorAgent.name,
            isOrchestratorPrompt: true,
          },
        });
      }
    }

    return {
      messages,
      requiresUserResponse: !params.autoMode,
    };
  }

  /**
   * Handle Q&A Mode (free-form conversation with agent swarm)
   */
  private async handleQAMode(params: {
    agent: any;
    message: string;
    sessionId: string;
    conversationHistory: any[];
    autoMode: boolean;
  }): Promise<any> {
    logger.info('Handling Q&A mode');

    // Determine which agents are relevant
    const input: RuntimeInput = {
      entryAgentId: params.agent.id,
      userMessage: params.message,
      sessionId: params.sessionId,
      context: {},
      conversationHistory: params.conversationHistory,
    };

    const planResult = await this.planConsultations(input);
    const relevantAgents = planResult.consultations;

    const messages = [];

    // Execute consultations with relevant agents
    for (const consult of relevantAgents) {
      // Generate orchestrator message for this consultation
      const orchestratorMsg = await this.generateOrchestratorMessage({
        agent: params.agent,
        userMessage: params.message,
        consultation: consult,
        mode: 'QA',
        autoMode: params.autoMode,
      });

      const orchestratorMessage = {
        role: 'ASSISTANT',
        content: `${orchestratorMsg.acknowledgement}\n\n${orchestratorMsg.agentPrompt}`,
        metadata: {
          agentName: params.agent.name,
          isOrchestratorPrompt: true,
        },
      };

      // Save orchestrator message to database immediately
      await prisma.chatMessage.create({
        data: {
          sessionId: params.sessionId,
          role: orchestratorMessage.role,
          content: orchestratorMessage.content,
          metadata: orchestratorMessage.metadata as any,
        },
      });

      messages.push(orchestratorMessage);

      // Execute consultation with the detailed prompt
      const result = await this.executeConsultation({
        agentId: consult.agentId,
        question: orchestratorMsg.agentPrompt,
        context: {
          ...planResult.context,
          orchestrationMode: 'QA',
          autoMode: params.autoMode,
          userMessage: params.message,
        },
        sessionId: params.sessionId,
      });

      const agentMessage = {
        role: 'ASSISTANT',
        content: result.response,
        metadata: {
          agentName: consult.agentName,
          purpose: consult.purpose,
        },
      };

      // Save agent response to database immediately
      await prisma.chatMessage.create({
        data: {
          sessionId: params.sessionId,
          role: agentMessage.role,
          content: agentMessage.content,
          metadata: agentMessage.metadata as any,
        },
      });

      messages.push(agentMessage);
    }

    // If no agents responded, use orchestrator directly
    if (messages.length === 0) {
      const llmProvider = await this.getLLMProvider(params.agent);
      const llmResponse = await llmProvider.complete({
        messages: [
          { role: 'system', content: params.agent.instructions },
          ...params.conversationHistory.map(h => ({ role: h.role as MessageRole, content: h.content })),
          { role: 'user', content: params.message },
        ],
        model: params.agent.model?.modelId || 'default',
        temperature: params.agent.model?.temperature || 0.7,
        maxTokens: params.agent.model?.maxTokens || 4000,
      });

      messages.push({
        role: 'ASSISTANT',
        content: llmResponse.content,
        metadata: {
          agentName: params.agent.name,
        },
      });
    }

    // Add orchestrator follow-up if not auto mode
    if (!params.autoMode) {
      const orchestratorPrompt = await this.generateOrchestratorPrompt({
        agent: params.agent,
        currentStep: 'qa_response',
        completedConsultations: messages.map(m => m.metadata.agentName),
        remainingConsultations: [],
        mode: 'QA',
        autoMode: params.autoMode,
      });

      if (orchestratorPrompt) {
        messages.push({
          role: 'ASSISTANT',
          content: orchestratorPrompt,
          metadata: {
            agentName: params.agent.name,
            isOrchestratorPrompt: true,
          },
        });
      }
    }

    return {
      messages,
      requiresUserResponse: !params.autoMode,
    };
  }

  /**
   * Handle Flow Mode (structured workflow with guidance)
   */
  private async handleFlowMode(params: {
    agent: any;
    message: string;
    sessionId: string;
    conversationHistory: any[];
    autoMode: boolean;
  }): Promise<any> {
    logger.info('Handling Flow mode');

    // Analyze conversation state
    const completedAgents = params.conversationHistory
      .filter(h => h.metadata?.agentName && h.metadata?.agentName !== params.agent.name)
      .map(h => h.metadata.agentName)
      .filter((name, index, self) => self.indexOf(name) === index);

    // Plan consultations
    const input: RuntimeInput = {
      entryAgentId: params.agent.id,
      userMessage: params.message,
      sessionId: params.sessionId,
      context: { completedAgents },
      conversationHistory: params.conversationHistory,
    };

    const planResult = await this.planConsultations(input);
    const plannedConsultations = planResult.consultations.filter(
      c => !completedAgents.includes(c.agentName)
    );

    const messages = [];

    // In auto mode, execute all consultations
    if (params.autoMode) {
      for (const consult of plannedConsultations) {
        // Generate orchestrator message for this consultation
        const orchestratorMsg = await this.generateOrchestratorMessage({
          agent: params.agent,
          userMessage: params.message,
          consultation: consult,
          mode: 'FLOW',
          autoMode: params.autoMode,
        });

        const orchestratorMessage = {
          role: 'ASSISTANT',
          content: `${orchestratorMsg.acknowledgement}\n\n${orchestratorMsg.agentPrompt}`,
          metadata: {
            agentName: params.agent.name,
            isOrchestratorPrompt: true,
          },
        };

        // Save orchestrator message to database immediately
        await prisma.chatMessage.create({
          data: {
            sessionId: params.sessionId,
            role: orchestratorMessage.role,
            content: orchestratorMessage.content,
            metadata: orchestratorMessage.metadata as any,
          },
        });

        // Add to messages array for return
        messages.push(orchestratorMessage);

        // Execute consultation with the detailed prompt
        const result = await this.executeConsultation({
          agentId: consult.agentId,
          question: orchestratorMsg.agentPrompt,
          context: {
            ...planResult.context,
            orchestrationMode: 'FLOW',
            autoMode: params.autoMode,
            userMessage: params.message,
          },
          sessionId: params.sessionId,
        });

        const agentMessage = {
          role: 'ASSISTANT',
          content: result.response,
          metadata: {
            agentName: consult.agentName,
            purpose: consult.purpose,
          },
        };

        // Save agent response to database immediately
        await prisma.chatMessage.create({
          data: {
            sessionId: params.sessionId,
            role: agentMessage.role,
            content: agentMessage.content,
            metadata: agentMessage.metadata as any,
          },
        });

        messages.push(agentMessage);
      }

      // Synthesize final response
      const synthesis = await this.synthesizeFinalResponse({
        agentId: params.agent.id,
        userMessage: params.message,
        consultations: messages.map(m => ({
          agentName: m.metadata.agentName,
          purpose: m.metadata.purpose,
          response: m.content,
        })),
        context: planResult.context,
        sessionId: params.sessionId,
      });

      messages.push({
        role: 'ASSISTANT',
        content: synthesis.finalResponse,
        metadata: {
          agentName: params.agent.name,
          isFinalSynthesis: true,
        },
      });

      return {
        messages,
        requiresUserResponse: false,
      };
    } else {
      // Manual mode: execute next consultation and ask for feedback
      if (plannedConsultations.length > 0) {
        const nextConsult = plannedConsultations[0];

        // Generate orchestrator message for this consultation
        const orchestratorMsg = await this.generateOrchestratorMessage({
          agent: params.agent,
          userMessage: params.message,
          consultation: nextConsult,
          mode: 'FLOW',
          autoMode: params.autoMode,
        });

        const orchestratorMessage = {
          role: 'ASSISTANT',
          content: `${orchestratorMsg.acknowledgement}\n\n${orchestratorMsg.agentPrompt}`,
          metadata: {
            agentName: params.agent.name,
            isOrchestratorPrompt: true,
          },
        };

        // Save orchestrator message to database immediately
        await prisma.chatMessage.create({
          data: {
            sessionId: params.sessionId,
            role: orchestratorMessage.role,
            content: orchestratorMessage.content,
            metadata: orchestratorMessage.metadata as any,
          },
        });

        messages.push(orchestratorMessage);

        // Execute consultation with the detailed prompt
        const result = await this.executeConsultation({
          agentId: nextConsult.agentId,
          question: orchestratorMsg.agentPrompt,
          context: {
            ...planResult.context,
            orchestrationMode: 'FLOW',
            autoMode: params.autoMode,
            userMessage: params.message,
          },
          sessionId: params.sessionId,
        });

        const agentMessage = {
          role: 'ASSISTANT',
          content: result.response,
          metadata: {
            agentName: nextConsult.agentName,
            purpose: nextConsult.purpose,
          },
        };

        // Save agent response to database immediately
        await prisma.chatMessage.create({
          data: {
            sessionId: params.sessionId,
            role: agentMessage.role,
            content: agentMessage.content,
            metadata: agentMessage.metadata as any,
          },
        });

        messages.push(agentMessage);

        // Add orchestrator follow-up prompt
        const remainingAgents = plannedConsultations.slice(1).map(c => c.agentName);
        const orchestratorPrompt = await this.generateOrchestratorPrompt({
          agent: params.agent,
          currentStep: 'consultation_complete',
          completedConsultations: [...completedAgents, nextConsult.agentName],
          remainingConsultations: remainingAgents,
          mode: 'FLOW',
          autoMode: params.autoMode,
        });

        if (orchestratorPrompt) {
          messages.push({
            role: 'ASSISTANT',
            content: orchestratorPrompt,
            metadata: {
              agentName: params.agent.name,
              isOrchestratorPrompt: true,
            },
          });
        }

        return {
          messages,
          requiresUserResponse: true,
        };
      } else {
        // No more consultations, offer synthesis
        const orchestratorPrompt = "We've gathered input from all relevant specialists. Should I synthesize this into a comprehensive response, or would you like to explore any specific area further?";

        messages.push({
          role: 'ASSISTANT',
          content: orchestratorPrompt,
          metadata: {
            agentName: params.agent.name,
            isOrchestratorPrompt: true,
            offeringSynthesis: true,
          },
        });

        return {
          messages,
          requiresUserResponse: true,
        };
      }
    }
  }
}

export default new AgentRuntime();

