'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { agentsApi } from '@/lib/api';
import { TestTube, Send, Loader2, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
}

interface ExecutionResult {
  finalResponse: string;
  toolCalls: Array<{
    toolId: string;
    toolName: string;
    parameters: Record<string, any>;
    result?: any;
    error?: string;
  }>;
  consultsExecuted: Array<{
    agentId: string;
    agentName: string;
    purpose: string;
    response: string;
    toolCalls: any[];
    executionTimeMs: number;
  }>;
  memoryUpdates: Array<{
    type: string;
    content: string;
    saved: boolean;
    reason?: string;
  }>;
  debugInfo: {
    totalAgentsExecuted: number;
    executionPath: string[];
    errors: Array<{
      agentId: string;
      error: string;
      timestamp: string;
    }>;
    metadata: Record<string, any>;
  };
  executionTimeMs: number;
}

export default function TestConsolePage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    toolCalls: true,
    consults: false,
    memory: false,
    debug: false,
  });

  // Fetch agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ limit: 100 }),
  });

  const agents: Agent[] = (agentsData as any)?.data || [];

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: (data: { id: string; userMessage: string; sessionId?: string; context?: any }) =>
      agentsApi.execute(data.id, {
        userMessage: data.userMessage,
        sessionId: data.sessionId,
        context: data.context,
      }),
  });

  const result: ExecutionResult | undefined = executeMutation.data
    ? (executeMutation.data as any)?.data
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId || !message.trim()) return;

    executeMutation.mutate({
      id: selectedAgentId,
      userMessage: message,
      sessionId: sessionId || undefined,
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Test Console
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Test agents and view execution details
        </p>
      </div>

      {/* Test Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Agent Selector */}
          <div>
            <label
              htmlFor="agent"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Select Agent <span className="text-red-500">*</span>
            </label>
            <select
              id="agent"
              required
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an agent...</option>
              {agents
                .filter((a) => a.isActive)
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Message Input */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your message here..."
            />
          </div>

          {/* Session ID (Optional) */}
          <div>
            <label
              htmlFor="sessionId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Session ID (Optional)
            </label>
            <input
              type="text"
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Leave empty for new session"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use the same session ID to maintain conversation context
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={executeMutation.isPending || !selectedAgentId || !message.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Execute
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {executeMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-900 dark:text-red-200">Execution Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {(executeMutation.error as any)?.message || 'An error occurred during execution'}
          </p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4">
          {/* Response */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Response</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                {result.executionTimeMs}ms
              </div>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {result.finalResponse}
              </p>
            </div>
          </div>

          {/* Tool Calls */}
          {result.toolCalls && result.toolCalls.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleSection('toolCalls')}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tool Calls ({result.toolCalls.length})
                </h2>
                {expandedSections.toolCalls ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {expandedSections.toolCalls && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                  {result.toolCalls.map((toolCall, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <TestTube className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {toolCall.toolName}
                        </span>
                        {toolCall.error ? (
                          <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Parameters:</span>
                          <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                            {formatJson(toolCall.parameters)}
                          </pre>
                        </div>
                        {toolCall.result && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Result:</span>
                            <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                              {formatJson(toolCall.result)}
                            </pre>
                          </div>
                        )}
                        {toolCall.error && (
                          <div className="text-red-600 dark:text-red-400">
                            Error: {toolCall.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Consults */}
          {result.consultsExecuted && result.consultsExecuted.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleSection('consults')}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Consults ({result.consultsExecuted.length})
                </h2>
                {expandedSections.consults ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {expandedSections.consults && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                  {result.consultsExecuted.map((consult, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {consult.agentName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            ({consult.executionTimeMs}ms)
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Purpose: {consult.purpose}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {consult.response}
                      </div>
                      {consult.toolCalls && consult.toolCalls.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Tools used: {consult.toolCalls.length}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Memory Updates */}
          {result.memoryUpdates && result.memoryUpdates.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleSection('memory')}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Memory Updates ({result.memoryUpdates.length})
                </h2>
                {expandedSections.memory ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {expandedSections.memory && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
                  {result.memoryUpdates.map((update, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      {update.saved ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {update.type}
                          </span>
                          {update.saved && (
                            <span className="text-xs text-green-600 dark:text-green-400">Saved</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{update.content}</p>
                        {update.reason && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Reason: {update.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Debug Info */}
          {result.debugInfo && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleSection('debug')}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Debug Info</h2>
                {expandedSections.debug ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {expandedSections.debug && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Agents Executed:
                    </span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">
                      {result.debugInfo.totalAgentsExecuted}
                    </span>
                  </div>
                  {result.debugInfo.executionPath && result.debugInfo.executionPath.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Execution Path:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {result.debugInfo.executionPath.map((path, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                          >
                            {path}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.debugInfo.errors && result.debugInfo.errors.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Errors:
                      </span>
                      <div className="mt-2 space-y-2">
                        {result.debugInfo.errors.map((error, index) => (
                          <div
                            key={index}
                            className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm"
                          >
                            <div className="font-medium text-red-900 dark:text-red-200">
                              {error.agentId}
                            </div>
                            <div className="text-red-700 dark:text-red-300">{error.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.debugInfo.metadata && Object.keys(result.debugInfo.metadata).length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Metadata:
                      </span>
                      <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                        {formatJson(result.debugInfo.metadata)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

