/**
 * API Client for Orchi AI Backend
 * Connects to the backend API
 */

// Use environment variable or detect the backend URL based on current hostname
const getApiBaseUrl = () => {
  // If running in browser, use runtime detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // If accessing via domain (orchiai.com), use same domain for API (via Nginx proxy)
    // Nginx will route /api/* to backend, so base URL is just the domain
    if (hostname === 'orchiai.com' || hostname === 'www.orchiai.com') {
      return `${protocol}//${hostname}`;
    }

    // For localhost, connect to backend on port 3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }

    // For other domains/IPs, assume backend is on same host port 3001
    return `http://${hostname}:3001`;
  }

  // Server-side rendering default
  return 'http://localhost:3001';
};

// Create a singleton that gets the base URL at runtime
let _apiBaseUrl: string | null = null;
const getOrSetApiBaseUrl = () => {
  if (_apiBaseUrl === null) {
    _apiBaseUrl = getApiBaseUrl();
    if (typeof window !== 'undefined') {
      console.log('[API Client] Initialized with base URL:', _apiBaseUrl);
    }
  }
  return _apiBaseUrl;
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

class ApiClient {
  private getBaseUrl(): string {
    return getOrSetApiBaseUrl();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.getBaseUrl()}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network request failed',
        },
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export convenience methods for each service
export const agentsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
    return apiClient.get(`/api/v1/agents?${query.toString()}`);
  },
  get: (id: string) => apiClient.get(`/api/v1/agents/${id}`),
  create: (data: any) => apiClient.post('/api/v1/agents', data),
  update: (id: string, data: any) => apiClient.patch(`/api/v1/agents/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/agents/${id}`),
  activate: (id: string) => apiClient.post(`/api/v1/agents/${id}/activate`),
  deactivate: (id: string) => apiClient.post(`/api/v1/agents/${id}/deactivate`),
  execute: (id: string, data: { userMessage: string; sessionId?: string; context?: any }) =>
    apiClient.post(`/api/v1/agents/${id}/execute`, data),

  executeStream: async (
    id: string,
    data: { userMessage: string; sessionId?: string; context?: any },
    onEvent: (event: any) => void
  ) => {
    const baseUrl = getOrSetApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/agents/${id}/execute/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Stream request failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    let buffer = ''; // Buffer for incomplete lines

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by newlines, but keep the last incomplete line in buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line

      // Process complete lines
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6).trim();
            if (jsonStr) {
              const eventData = JSON.parse(jsonStr);
              onEvent(eventData);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e, 'Line:', line);
          }
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim() && buffer.startsWith('data: ')) {
      try {
        const jsonStr = buffer.substring(6).trim();
        if (jsonStr) {
          const eventData = JSON.parse(jsonStr);
          onEvent(eventData);
        }
      } catch (e) {
        console.error('Failed to parse final SSE data:', e);
      }
    }
  },

  // Frontend-driven orchestration (group-chat style)
  planConsultations: (id: string, data: { userMessage: string; sessionId?: string; context?: any }) =>
    apiClient.post(`/api/v1/agents/${id}/orchestrate/plan`, data),

  executeConsultation: (data: { agentId: string; question: string; context?: any; sessionId?: string }) =>
    apiClient.post('/api/v1/agents/consult', data),

  synthesizeFinalResponse: (id: string, data: {
    userMessage: string;
    consultations: Array<{ agentName: string; purpose: string; response: string }>;
    context?: any;
    sessionId?: string;
  }) => apiClient.post(`/api/v1/agents/${id}/orchestrate/synthesize`, data),

  // New conversational message handler
  sendConversationalMessage: (data: {
    message: string;
    sessionId: string;
    agentId: string;
    conversationHistory?: Array<{
      role: string;
      content: string;
      metadata?: Record<string, any>;
    }>;
    autoMode?: boolean;
    orchestrationMode?: 'FLOW' | 'QA';
  }) => apiClient.post('/api/v1/agents/conversational-message', data),

  // SSE streaming version of conversational message handler
  sendConversationalMessageStream: async (
    data: {
      message: string;
      sessionId: string;
      agentId: string;
      conversationHistory?: Array<{
        role: string;
        content: string;
        metadata?: Record<string, any>;
      }>;
      autoMode?: boolean;
      orchestrationMode?: 'FLOW' | 'QA';
    },
    onMessage: (message: any) => void,
    onError?: (error: string) => void,
    onComplete?: () => void
  ) => {
    const baseURL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://orchiai.com';

    const response = await fetch(`${baseURL}/api/v1/agents/conversational-message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      onError?.(error || 'Failed to stream messages');
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      onError?.('No response body');
      return;
    }

    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by newlines, but keep the last incomplete line in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              if (event.type === 'done') {
                onComplete?.();
                return;
              } else if (event.type === 'error') {
                onError?.(event.error);
                return;
              } else if (event.type === 'message') {
                onMessage(event.data);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const data = buffer.slice(6).trim();
          if (data) {
            const event = JSON.parse(data);
            if (event.type === 'done') {
              onComplete?.();
            } else if (event.type === 'error') {
              onError?.(event.error);
            } else if (event.type === 'message') {
              onMessage(event.data);
            }
          }
        } catch (e) {
          console.error('Failed to parse final SSE data:', e);
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Streaming error');
    }
  },

  // Consult rules
  getConsults: (id: string) => apiClient.get(`/api/v1/agents/${id}/consults`),
  addConsult: (id: string, data: { consultedAgentId: string; whenCondition: string; conditionalRule?: string; purpose: string; order: number }) =>
    apiClient.post(`/api/v1/agents/${id}/consults`, data),
  updateConsult: (id: string, consultId: string, data: any) =>
    apiClient.patch(`/api/v1/agents/${id}/consults/${consultId}`, data),
  deleteConsult: (id: string, consultId: string) =>
    apiClient.delete(`/api/v1/agents/${id}/consults/${consultId}`),
  reorderConsults: (id: string, ruleIds: string[]) =>
    apiClient.post(`/api/v1/agents/${id}/consults/reorder`, { ruleIds }),
};

export const modelsApi = {
  list: (params?: { page?: number; limit?: number; provider?: string; isActive?: boolean; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.provider) query.set('provider', params.provider);
    if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
    if (params?.search) query.set('search', params.search);
    return apiClient.get(`/api/v1/models?${query.toString()}`);
  },
  get: (id: string) => apiClient.get(`/api/v1/models/${id}`),
  create: (data: any) => apiClient.post('/api/v1/models', data),
  update: (id: string, data: any) => apiClient.patch(`/api/v1/models/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/models/${id}`),
  test: (id: string) => apiClient.post(`/api/v1/models/${id}/test`),
};

export const toolsApi = {
  list: (params?: { page?: number; limit?: number; type?: string; isActive?: boolean; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.type) query.set('type', params.type);
    if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
    if (params?.search) query.set('search', params.search);
    return apiClient.get(`/api/v1/tools?${query.toString()}`);
  },
  get: (id: string) => apiClient.get(`/api/v1/tools/${id}`),
  create: (data: any) => apiClient.post('/api/v1/tools', data),
  update: (id: string, data: any) => apiClient.patch(`/api/v1/tools/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/tools/${id}`),
  activate: (id: string) => apiClient.post(`/api/v1/tools/${id}/activate`),
  deactivate: (id: string) => apiClient.post(`/api/v1/tools/${id}/deactivate`),
  execute: (id: string, parameters: any) =>
    apiClient.post(`/api/v1/tools/${id}/execute`, { parameters }),
  test: (id: string) => apiClient.post(`/api/v1/tools/${id}/test`),
};

export const triggersApi = {
  list: (params?: { page?: number; limit?: number; type?: string; isEnabled?: boolean; search?: string; agentId?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.type) query.set('type', params.type);
    if (params?.isEnabled !== undefined) query.set('isEnabled', params.isEnabled.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.agentId) query.set('agentId', params.agentId);
    return apiClient.get(`/api/v1/triggers?${query.toString()}`);
  },
  get: (id: string) => apiClient.get(`/api/v1/triggers/${id}`),
  create: (data: any) => apiClient.post('/api/v1/triggers', data),
  update: (id: string, data: any) => apiClient.patch(`/api/v1/triggers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/triggers/${id}`),
  enable: (id: string) => apiClient.post(`/api/v1/triggers/${id}/enable`),
  disable: (id: string) => apiClient.post(`/api/v1/triggers/${id}/disable`),
  executeChat: (id: string, data: { message: string; sessionId?: string }) =>
    apiClient.post(`/api/v1/triggers/${id}/execute/chat`, data),
  executeWebhook: (id: string, payload: any) =>
    apiClient.post(`/api/v1/triggers/${id}/execute/webhook`, payload),
  executeScheduled: (id: string) =>
    apiClient.post(`/api/v1/triggers/${id}/execute/scheduled`),
  validate: (id: string) => apiClient.post(`/api/v1/triggers/${id}/validate`),
};

export const providerConnectionsApi = {
  list: (params?: { page?: number; limit?: number; provider?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.provider) query.set('provider', params.provider);
    if (params?.search) query.set('search', params.search);
    return apiClient.get(`/api/v1/provider-connections?${query.toString()}`);
  },
  get: (id: string) => apiClient.get(`/api/v1/provider-connections/${id}`),
  create: (data: any) => apiClient.post('/api/v1/provider-connections', data),
  update: (id: string, data: any) => apiClient.patch(`/api/v1/provider-connections/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/provider-connections/${id}`),
  getByProvider: (provider: string) =>
    apiClient.get(`/api/v1/provider-connections/provider/${provider}`),
  test: (data: { type?: string; apiKey?: string; endpoint?: string; credentials?: Record<string, any> }) =>
    apiClient.post('/api/v1/provider-connections/test', data),
};

export const memoriesApi = {
  list: (params?: { agentId?: string; type?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.agentId) query.set('agentId', params.agentId);
    if (params?.type) query.set('type', params.type);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return apiClient.get(`/api/v1/memories?${query.toString()}`);
  },
  get: (id: string) => apiClient.get(`/api/v1/memories/${id}`),
  create: (data: any) => apiClient.post('/api/v1/memories', data),
  update: (id: string, data: any) => apiClient.patch(`/api/v1/memories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/memories/${id}`),
  shouldSummarize: (agentId: string, threshold: number) =>
    apiClient.post(`/api/v1/memories/agents/${agentId}/should-summarize`, { threshold }),
  summarize: (agentId: string) =>
    apiClient.post(`/api/v1/memories/agents/${agentId}/summarize`),
  getContext: (agentId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiClient.get(`/api/v1/memories/agents/${agentId}/context${query}`);
  },
  approve: (agentId: string, content: string) =>
    apiClient.post(`/api/v1/memories/agents/${agentId}/approve`, { content }),
};

export const chatApi = {
  // Session endpoints
  listSessions: (params?: { agentId?: string; userId?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.agentId) query.set('agentId', params.agentId);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return apiClient.get(`/api/v1/chat/sessions?${query.toString()}`);
  },
  getSession: (id: string) => apiClient.get(`/api/v1/chat/sessions/${id}`),
  createSession: (data: { agentId: string; userId?: string; metadata?: any }) =>
    apiClient.post('/api/v1/chat/sessions', data),
  updateSession: (id: string, data: { metadata?: any; orchestrationMode?: 'FLOW' | 'QA' }) =>
    apiClient.patch(`/api/v1/chat/sessions/${id}`, data),
  deleteSession: (id: string) => apiClient.delete(`/api/v1/chat/sessions/${id}`),
  getSessionsByAgent: (agentId: string) =>
    apiClient.get(`/api/v1/chat/sessions/agent/${agentId}`),
  getSessionsByUser: (userId: string) =>
    apiClient.get(`/api/v1/chat/sessions/user/${userId}`),

  // Message endpoints
  listMessages: (sessionId: string, params?: { role?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return apiClient.get(`/api/v1/chat/sessions/${sessionId}/messages?${query.toString()}`);
  },
  getMessage: (id: string) => apiClient.get(`/api/v1/chat/messages/${id}`),
  createMessage: (data: { sessionId: string; role: string; content: string; metadata?: any }) =>
    apiClient.post('/api/v1/chat/messages', data),
  updateMessage: (id: string, data: { content?: string; metadata?: any }) =>
    apiClient.patch(`/api/v1/chat/messages/${id}`, data),
  deleteMessage: (id: string) => apiClient.delete(`/api/v1/chat/messages/${id}`),
};


