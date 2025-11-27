// Core Enums
export enum Provider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  CUSTOM = 'CUSTOM',
}

export enum ToolType {
  SEEDREAM = 'SEEDREAM',
  VEO = 'VEO',
  CRM = 'CRM',
  EMAIL = 'EMAIL',
  SOCIAL = 'SOCIAL',
  WEBHOOK = 'WEBHOOK',
  CUSTOM = 'CUSTOM',
}

export enum TriggerType {
  CHAT = 'CHAT',
  WEBHOOK = 'WEBHOOK',
  SCHEDULED = 'SCHEDULED',
}

export enum WhenCondition {
  ALWAYS = 'ALWAYS',
  CONDITIONAL = 'CONDITIONAL',
  ONLY_IF_NEEDED = 'ONLY_IF_NEEDED',
}

export enum MemoryStrategy {
  AUTO = 'AUTO',
  ASK_USER = 'ASK_USER',
  MANUAL_ONLY = 'MANUAL_ONLY',
}

export enum MemoryType {
  SHORT_TERM = 'SHORT_TERM',
  LONG_TERM = 'LONG_TERM',
  SUMMARY = 'SUMMARY',
}

export enum OrchestrationMode {
  FLOW = 'FLOW',  // Structured workflow with orchestrator guidance
  QA = 'QA',      // Free-form Q&A with agent swarm
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  TOOL = 'TOOL',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  instructions: string;
  modelId?: string;
  memoryStrategy: MemoryStrategy;
  memoryThreshold: number;
  askBeforeSaving: boolean;
  orchestrationMode: OrchestrationMode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConsult {
  id: string;
  agentId: string;
  consultedAgentId: string;
  whenCondition: WhenCondition;
  conditionalRule?: string;
  purpose: string;
  order: number;
}

// Model Types
export interface ModelProfile {
  id: string;
  name: string;
  provider: Provider;
  modelId: string;
  endpoint?: string;
  temperature: number;
  maxTokens: number;
  connectionId?: string;
  isActive: boolean;
}

export interface ProviderConnection {
  id: string;
  name: string;
  type?: string; // Connection type (e.g., "openai", "anthropic", "http", "oauth2", etc.) - optional for generic connections
  apiKey: string;
  encryptionKey: string;
  endpoint?: string;
  metadata?: Record<string, any>;
}

// Tool Types
export interface Tool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  endpoint?: string;
  method: HttpMethod;
  schema: Record<string, any>;
  connectionId?: string;
}

// Trigger Types
export interface Trigger {
  id: string;
  name: string;
  type: TriggerType;
  agentId: string;
  config: Record<string, any>;
  isEnabled: boolean;
  secretToken?: string;
}

// Chat Types
export interface ChatSession {
  id: string;
  agentId: string;
  userId?: string;
  title?: string;
  orchestrationMode: OrchestrationMode;
  startedAt: Date;
  lastMessageAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Memory Types
export interface MemoryItem {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

// Runtime Types
export interface RuntimeInput {
  entryAgentId: string;
  userMessage: string;
  sessionId?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  conversationHistory?: Array<{
    role: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
}

export interface RuntimeOutput {
  finalResponse: string;
  toolCalls: ToolCall[];
  consultsExecuted: ConsultExecution[];
  memoryUpdates: MemoryUpdate[];
  debugInfo: DebugInfo;
  executionTimeMs: number;
}

export interface ToolCall {
  toolId: string;
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
}

export interface ConsultExecution {
  agentId: string;
  agentName: string;
  purpose: string;
  response: string;
  toolCalls: ToolCall[];
  executionTimeMs: number;
}

export interface MemoryUpdate {
  type: MemoryType;
  content: string;
  saved: boolean;
  reason?: string;
}

export interface DebugInfo {
  totalAgentsExecuted: number;
  executionPath: string[];
  errors: Array<{
    agentId: string;
    error: string;
    timestamp: Date;
  }>;
  metadata: Record<string, any>;
}

// LLM Provider Types
export interface CompletionRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}

export interface CompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// DTO Types for API
export interface CreateAgentDTO {
  name: string;
  instructions: string;
  modelId?: string;
  memoryStrategy?: MemoryStrategy;
  memoryThreshold?: number;
  askBeforeSaving?: boolean;
  orchestrationMode?: OrchestrationMode;
}

export interface UpdateAgentDTO {
  name?: string;
  instructions?: string;
  modelId?: string;
  memoryStrategy?: MemoryStrategy;
  memoryThreshold?: number;
  askBeforeSaving?: boolean;
  orchestrationMode?: OrchestrationMode;
  isActive?: boolean;
}

export interface CreateConsultRuleDTO {
  consultedAgentId: string;
  whenCondition: WhenCondition;
  conditionalRule?: string;
  purpose: string;
  order: number;
}

export interface CreateModelDTO {
  name: string;
  provider: Provider;
  modelId: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  connectionId?: string;
  isActive?: boolean;
}

export interface UpdateModelDTO {
  name?: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  isActive?: boolean;
}

export interface CreateProviderConnectionDTO {
  name: string;
  type?: string; // Connection type - optional
  apiKey?: string; // Optional for backward compatibility
  endpoint?: string;
  metadata?: Record<string, any>; // Stores all credential fields
  credentials?: Record<string, any>; // Alternative to metadata
}

export interface UpdateProviderConnectionDTO {
  name?: string;
  type?: string;
  apiKey?: string;
  endpoint?: string;
  metadata?: Record<string, any>;
}

export interface CreateToolDTO {
  name: string;
  description: string;
  type: ToolType;
  endpoint?: string;
  method?: HttpMethod;
  schema: Record<string, any>;
  connectionId?: string;
  isActive?: boolean;
}

export interface UpdateToolDTO {
  name?: string;
  description?: string;
  endpoint?: string;
  method?: HttpMethod;
  schema?: Record<string, any>;
  isActive?: boolean;
}

export interface CreateTriggerDTO {
  name: string;
  type: TriggerType;
  agentId: string;
  config: Record<string, any>;
  secretToken?: string;
  isEnabled?: boolean;
}

export interface UpdateTriggerDTO {
  name?: string;
  config?: Record<string, any>;
  isEnabled?: boolean;
  secretToken?: string;
}

export interface CreateMemoryDTO {
  agentId: string;
  type: MemoryType;
  content: string;
  metadata?: Record<string, any>;
  expiresAt?: Date | string;
}

export interface UpdateMemoryDTO {
  content?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date | string | null;
}

export interface CreateChatSessionDTO {
  agentId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateChatSessionDTO {
  metadata?: Record<string, any>;
}

export interface CreateChatMessageDTO {
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
}

export interface UpdateChatMessageDTO {
  content?: string;
  metadata?: Record<string, any>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
