'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, agentsApi } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Clock,
  MessageSquare,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  metadata?: any;
  createdAt: string;
}

interface ChatSession {
  id: string;
  agentId: string;
  userId?: string;
  startedAt: string;
  lastMessageAt: string;
  metadata?: any;
  agent?: {
    id: string;
    name: string;
  };
}

export default function ChatSessionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userMessage, setUserMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [expandedConsults, setExpandedConsults] = useState<{ [messageId: string]: boolean }>({});
  const [autoMode, setAutoMode] = useState(() => {
    // Load from localStorage or default to true
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orchiai_auto_mode');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });
  const [executionProgress, setExecutionProgress] = useState<{
    isExecuting: boolean;
    currentStep: string;
    consultations: Array<{
      agentName: string;
      purpose: string;
      prompt?: string;
      status: 'pending' | 'executing' | 'completed';
      response?: string;
      fullResponse?: string;
    }>;
  }>({
    isExecuting: false,
    currentStep: '',
    consultations: [],
  });

  // Save auto mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orchiai_auto_mode', String(autoMode));
    }
  }, [autoMode]);

  // Step-by-step workflow state
  const [workflowState, setWorkflowState] = useState<{
    active: boolean;
    step: 'idle' | 'planning' | 'confirm_plan' | 'consulting' | 'confirm_consultation' | 'synthesis' | 'confirm_synthesis' | 'completed';
    currentUserMessage: string;
    conversationHistory: any[];
    plannedConsultations: Array<{
      agentId: string;
      agentName: string;
      purpose: string;
      priority: number;
    }>;
    completedConsultations: Array<{
      agentName: string;
      purpose: string;
      response: string;
    }>;
    currentConsultationIndex: number;
    context: Record<string, any>;
    userFeedback: string;
    isReExecuting: boolean;
  }>({
    active: false,
    step: 'idle',
    currentUserMessage: '',
    conversationHistory: [],
    plannedConsultations: [],
    completedConsultations: [],
    currentConsultationIndex: 0,
    context: {},
    userFeedback: '',
    isReExecuting: false,
  });

  // Fetch session
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['chat-session', id],
    queryFn: () => chatApi.getSession(id),
    enabled: !!id,
  });

  const session: ChatSession = (sessionData as any)?.data;

  // Fetch messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', id],
    queryFn: () => chatApi.listMessages(id, { limit: 1000 }),
    enabled: !!id,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  const messages: ChatMessage[] = (messagesData as any)?.data || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Step 1: Start workflow - Save user message and plan consultations
  const startWorkflow = async () => {
    if (!userMessage.trim() || isSending) return;

    setIsSending(true);
    const content = userMessage;
    setUserMessage(''); // Clear input immediately

    try {
      // Save user message
      await chatApi.createMessage({
        sessionId: id,
        role: 'USER',
        content,
      });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });

      // Plan consultations
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
      }));

      const planResult = (await agentsApi.planConsultations(session.agentId, {
        userMessage: content,
        sessionId: id,
        conversationHistory,
      })) as any;

      const consultations = planResult.data.consultations || [];
      const context = planResult.data.context || {};

      // Update workflow state with plan
      setWorkflowState({
        active: true,
        step: autoMode ? 'consulting' : 'confirm_plan',
        currentUserMessage: content,
        conversationHistory,
        plannedConsultations: consultations,
        completedConsultations: [],
        currentConsultationIndex: 0,
        context,
        userFeedback: '',
        isReExecuting: false,
      });

      setIsSending(false);

      // If auto mode, proceed immediately
      if (autoMode) {
        executeAllConsultations(consultations, content, conversationHistory, context);
      }
    } catch (error: any) {
      console.error('[Chat] Failed to start workflow:', error);
      alert(`Failed to start workflow: ${error.message || 'Unknown error'}`);
      setIsSending(false);
    }
  };

  // Auto Mode: Execute all consultations without pausing
  const executeAllConsultations = async (
    consultations: any[],
    userMsg: string,
    convHistory: any[],
    ctx: Record<string, any>
  ) => {
    const consultationResults: Array<{ agentName: string; purpose: string; response: string }> = [];

    for (let i = 0; i < consultations.length; i++) {
      const consult = consultations[i];

      try {
        // Build contextual question
        let contextualQuestion = consult.purpose;
        if (consultationResults.length > 0) {
          const previousContext = consultationResults
            .map(c => `${c.agentName}: ${c.response}`)
            .join('\n\n');
          contextualQuestion = `${consult.purpose}\n\nPrevious consultations:\n${previousContext}\n\nOriginal request: ${userMsg}`;
        } else {
          contextualQuestion = `${consult.purpose}\n\nUser's request: ${userMsg}`;
        }

        // Show @mention message
        await chatApi.createMessage({
          sessionId: id,
          role: 'ASSISTANT',
          content: `@${consult.agentName} ${consult.purpose}`,
          metadata: {
            isConsultationRequest: true,
            agentName: session.agent?.name || 'ExecutiveAgent',
            consultedAgentName: consult.agentName,
          },
        });
        queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });

        // Execute consultation
        const enrichedContext = {
          ...ctx,
          userMessage: userMsg,
          previousConsultations: consultationResults,
        };

        const consultResult = (await agentsApi.executeConsultation({
          agentId: consult.agentId,
          question: contextualQuestion,
          context: enrichedContext,
          sessionId: id,
        })) as any;

        const agentResponse = consultResult.data.response;

        // Show agent response
        await chatApi.createMessage({
          sessionId: id,
          role: 'ASSISTANT',
          content: agentResponse,
          metadata: {
            isConsultationResponse: true,
            agentName: consult.agentName,
            purpose: consult.purpose,
          },
        });
        queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });

        consultationResults.push({
          agentName: consult.agentName,
          purpose: consult.purpose,
          response: agentResponse,
        });
      } catch (error: any) {
        console.error('[Chat] Failed to execute consultation:', error);
        alert(`Failed to execute consultation: ${error.message || 'Unknown error'}`);
        setWorkflowState(prev => ({ ...prev, active: false, step: 'idle' }));
        return;
      }
    }

    // Auto-proceed to synthesis
    await autoGenerateFinalResponse(userMsg, consultationResults, convHistory, ctx, consultations.length === 0);
  };

  // Auto Mode: Generate final response without confirmation
  const autoGenerateFinalResponse = async (
    userMsg: string,
    consultationResults: any[],
    convHistory: any[],
    ctx: Record<string, any>,
    isFollowUp: boolean
  ) => {
    try {
      const enrichedContext = {
        ...ctx,
        conversationHistory: convHistory,
        isFollowUp,
      };

      const synthesisResult = (await agentsApi.synthesizeFinalResponse(session.agentId, {
        userMessage: userMsg,
        consultations: consultationResults,
        context: enrichedContext,
        sessionId: id,
      })) as any;

      const finalResponse = synthesisResult.data.finalResponse;

      // Save final message
      await chatApi.createMessage({
        sessionId: id,
        role: 'ASSISTANT',
        content: finalResponse,
        metadata: {
          isFinalSynthesis: true,
          agentName: session.agent?.name || 'ExecutiveAgent',
          consultationsCount: consultationResults.length,
          consultedAgents: consultationResults.map((c: any) => c.agentName),
        },
      });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', id] });

      // Reset workflow
      setWorkflowState({
        active: false,
        step: 'idle',
        currentUserMessage: '',
        conversationHistory: [],
        plannedConsultations: [],
        completedConsultations: [],
        currentConsultationIndex: 0,
        context: {},
        userFeedback: '',
        isReExecuting: false,
      });
    } catch (error: any) {
      console.error('[Chat] Failed to generate final response:', error);
      alert(`Failed to generate final response: ${error.message || 'Unknown error'}`);
      setWorkflowState(prev => ({ ...prev, active: false, step: 'idle' }));
    }
  };

  // Manual Mode: Re-execute consultation with user feedback
  const reExecuteWithFeedback = async () => {
    if (!workflowState.userFeedback.trim()) {
      alert('Please provide feedback before re-executing');
      return;
    }

    const { currentConsultationIndex, plannedConsultations, completedConsultations, currentUserMessage, context, userFeedback } = workflowState;
    const consultIndex = currentConsultationIndex - 1; // Current consultation that needs revision
    const consult = plannedConsultations[consultIndex];

    setWorkflowState(prev => ({ ...prev, isReExecuting: true, step: 'consulting' }));

    try {
      // Build contextual question with user feedback
      let contextualQuestion = `${consult.purpose}\n\nUser feedback on your previous response:\n${userFeedback}\n\nPlease revise your response based on this feedback.`;
      
      if (consultIndex > 0) {
        const previousContext = completedConsultations
          .slice(0, consultIndex)
          .map(c => `${c.agentName}: ${c.response}`)
          .join('\n\n');
        contextualQuestion += `\n\nPrevious consultations:\n${previousContext}`;
      }
      
      contextualQuestion += `\n\nOriginal request: ${currentUserMessage}`;

      // Execute consultation with feedback
      const enrichedContext = {
        ...context,
        userMessage: currentUserMessage,
        userFeedback,
        previousConsultations: completedConsultations.slice(0, consultIndex),
      };

      const consultResult = (await agentsApi.executeConsultation({
        agentId: consult.agentId,
        question: contextualQuestion,
        context: enrichedContext,
        sessionId: id,
      })) as any;

      const revisedResponse = consultResult.data.response;

      // Show revised response
      await chatApi.createMessage({
        sessionId: id,
        role: 'ASSISTANT',
        content: revisedResponse,
        metadata: {
          isConsultationResponse: true,
          agentName: consult.agentName,
          purpose: consult.purpose,
          isRevision: true,
          userFeedback,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });

      // Update completed consultations with revised response
      const newCompletedConsultations = [...completedConsultations];
      newCompletedConsultations[consultIndex] = {
        agentName: consult.agentName,
        purpose: consult.purpose,
        response: revisedResponse,
      };

      setWorkflowState(prev => ({
        ...prev,
        step: 'confirm_consultation',
        completedConsultations: newCompletedConsultations,
        userFeedback: '',
        isReExecuting: false,
      }));
    } catch (error: any) {
      console.error('[Chat] Failed to re-execute consultation:', error);
      alert(`Failed to re-execute consultation: ${error.message || 'Unknown error'}`);
      setWorkflowState(prev => ({ ...prev, step: 'confirm_consultation', isReExecuting: false }));
    }
  };

  // Step 2: Execute next consultation
  const executeNextConsultation = async () => {
    const { currentConsultationIndex, plannedConsultations, completedConsultations, currentUserMessage, context } = workflowState;

    if (currentConsultationIndex >= plannedConsultations.length) {
      // All consultations done, move to synthesis confirmation
      setWorkflowState(prev => ({ ...prev, step: 'confirm_synthesis' }));
      return;
    }

    const consult = plannedConsultations[currentConsultationIndex];
    setWorkflowState(prev => ({ ...prev, step: 'consulting' }));

    try {
      // Build contextual question
      let contextualQuestion = consult.purpose;
      if (completedConsultations.length > 0) {
        const previousContext = completedConsultations
          .map(c => `${c.agentName}: ${c.response}`)
          .join('\n\n');
        contextualQuestion = `${consult.purpose}\n\nPrevious consultations:\n${previousContext}\n\nOriginal request: ${currentUserMessage}`;
      } else {
        contextualQuestion = `${consult.purpose}\n\nUser's request: ${currentUserMessage}`;
      }

      // Show @mention message
      await chatApi.createMessage({
        sessionId: id,
        role: 'ASSISTANT',
        content: `@${consult.agentName} ${consult.purpose}`,
        metadata: {
          isConsultationRequest: true,
          agentName: session.agent?.name || 'ExecutiveAgent',
          consultedAgentName: consult.agentName,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });

      // Execute consultation
      const enrichedContext = {
        ...context,
        userMessage: currentUserMessage,
        previousConsultations: completedConsultations,
      };

      const consultResult = (await agentsApi.executeConsultation({
        agentId: consult.agentId,
        question: contextualQuestion,
        context: enrichedContext,
        sessionId: id,
      })) as any;

      const agentResponse = consultResult.data.response;

      // Show agent response
      await chatApi.createMessage({
        sessionId: id,
        role: 'ASSISTANT',
        content: agentResponse,
        metadata: {
          isConsultationResponse: true,
          agentName: consult.agentName,
          purpose: consult.purpose,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });

      // Update workflow state
      const newCompletedConsultations = [
        ...completedConsultations,
        {
          agentName: consult.agentName,
          purpose: consult.purpose,
          response: agentResponse,
        },
      ];

      setWorkflowState(prev => ({
        ...prev,
        step: 'confirm_consultation',
        completedConsultations: newCompletedConsultations,
        currentConsultationIndex: currentConsultationIndex + 1,
      }));
    } catch (error: any) {
      console.error('[Chat] Failed to execute consultation:', error);
      alert(`Failed to execute consultation: ${error.message || 'Unknown error'}`);
      setWorkflowState(prev => ({ ...prev, step: 'confirm_consultation' }));
    }
  };

  // Step 3: Generate final synthesis
  const generateFinalResponse = async () => {
    setWorkflowState(prev => ({ ...prev, step: 'synthesis' }));

    try {
      const { currentUserMessage, completedConsultations, context, conversationHistory, plannedConsultations } = workflowState;

      const enrichedContext = {
        ...context,
        conversationHistory,
        isFollowUp: plannedConsultations.length === 0,
      };

      const synthesisResult = (await agentsApi.synthesizeFinalResponse(session.agentId, {
        userMessage: currentUserMessage,
        consultations: completedConsultations,
        context: enrichedContext,
        sessionId: id,
      })) as any;

      const finalResponse = synthesisResult.data.finalResponse;

      // Save final message
      await chatApi.createMessage({
        sessionId: id,
        role: 'ASSISTANT',
        content: finalResponse,
        metadata: {
          isFinalSynthesis: true,
          agentName: session.agent?.name || 'ExecutiveAgent',
          consultationsCount: completedConsultations.length,
          consultedAgents: completedConsultations.map(c => c.agentName),
        },
      });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', id] });

      // Reset workflow
      setWorkflowState({
        active: false,
        step: 'idle',
        currentUserMessage: '',
        conversationHistory: [],
        plannedConsultations: [],
        completedConsultations: [],
        currentConsultationIndex: 0,
        context: {},
        userFeedback: '',
      });
    } catch (error: any) {
      console.error('[Chat] Failed to generate final response:', error);
      alert(`Failed to generate final response: ${error.message || 'Unknown error'}`);
      setWorkflowState(prev => ({ ...prev, step: 'confirm_synthesis' }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    startWorkflow();
  };

  const toggleConsultExpansion = (messageId: string) => {
    setExpandedConsults(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: ChatMessage[] }, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Chat session not found</p>
        <Link
          href="/admin/chat"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Chat Sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <Link
          href="/admin/chat"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chat Sessions
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {session.agent?.name || 'Unknown Agent'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Started {formatDate(session.startedAt)} at {formatTime(session.startedAt)}
              </p>
            </div>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['chat-messages', id] })}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh messages"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 space-y-6">
        {messagesLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              No messages yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Start the conversation by sending a message below
            </p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date Divider */}
              <div className="flex items-center justify-center mb-4">
                <div className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                  {date}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-4">
                {dateMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'USER' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role !== 'USER' && (
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        {message.metadata?.agentName && (
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1 max-w-[60px] truncate text-center">
                            {message.metadata.agentName}
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] ${
                        message.role === 'USER'
                          ? 'bg-blue-600 text-white'
                          : message.metadata?.isConsultationRequest
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-gray-900 dark:text-white border-2 border-purple-300 dark:border-purple-700'
                          : message.metadata?.isConsultationResponse
                          ? 'bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-white border border-green-300 dark:border-green-700'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                      } rounded-lg shadow-sm`}
                    >
                      {message.role === 'USER' ? (
                        <div className="p-4">
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <p className="text-xs mt-2 text-blue-100">
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Consultation Steps (Reasoning) */}
                          {message.metadata?.consultsExecuted && message.metadata.consultsExecuted.length > 0 && (
                            <div className="border-b border-gray-200 dark:border-gray-700">
                              <button
                                onClick={() => toggleConsultExpansion(message.id)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Agent Consultations ({message.metadata.consultsExecuted.length})
                                  </span>
                                </div>
                                {expandedConsults[message.id] ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </button>

                              {expandedConsults[message.id] && (
                                <div className="px-4 pb-3 space-y-3">
                                  {message.metadata.consultsExecuted.map((consult: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                                    >
                                      <div className="flex items-start gap-2 mb-2">
                                        <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                              {consult.agentName}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                              <Clock className="h-3 w-3" />
                                              {consult.executionTimeMs}ms
                                            </div>
                                          </div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                                            Question: {consult.purpose}
                                          </p>
                                          <div className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600 max-h-64 overflow-y-auto">
                                            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                              {consult.response}
                                            </p>
                                          </div>
                                          {consult.toolCalls && consult.toolCalls.length > 0 && (
                                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                              Used {consult.toolCalls.length} tool{consult.toolCalls.length !== 1 ? 's' : ''}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Main Response */}
                          <div className="p-4">
                            <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {message.role === 'USER' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Execution Progress Display */}
                {executionProgress.isExecuting && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="max-w-[70%] bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                      {/* Current Step */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {executionProgress.currentStep}
                          </span>
                        </div>
                      </div>

                      {/* Consultation Progress */}
                      {executionProgress.consultations.length > 0 && (
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Agent Consultations
                            </span>
                          </div>
                          <div className="space-y-2">
                            {executionProgress.consultations.map((consult, idx) => (
                              <div
                                key={idx}
                                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                              >
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {consult.agentName}
                                      </span>
                                      {consult.status === 'executing' && (
                                        <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
                                      )}
                                      {consult.status === 'completed' && (
                                        <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                                      Question: {consult.prompt || consult.purpose}
                                    </p>
                                    {consult.status === 'completed' && consult.response && (
                                      <div className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600">
                                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                          {consult.response}
                                          {consult.response.length > 150 ? '...' : ''}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Streaming message */}
                {streamingMessage !== null && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="max-w-[70%] bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingMessage}
                        </ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Workflow Confirmation UI */}
      {workflowState.active && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
          {/* Step: Confirm Plan */}
          {workflowState.step === 'confirm_plan' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                Consultation Plan Ready
              </h3>
              {workflowState.plannedConsultations.length === 0 ? (
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  This appears to be a follow-up question. I can answer directly without consulting other agents.
                </p>
              ) : (
                <>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    I plan to consult <strong>{workflowState.plannedConsultations.length}</strong> specialist agent(s):
                  </p>
                  <ul className="space-y-2 mb-4">
                    {workflowState.plannedConsultations.map((agent, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{idx + 1}.</span>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">{agent.agentName}</span>
                          <p className="text-gray-600 dark:text-gray-400">{agent.purpose}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="flex gap-3">
                <button
                  onClick={executeNextConsultation}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Proceed
                </button>
                <button
                  onClick={() => setWorkflowState(prev => ({ ...prev, active: false, step: 'idle' }))}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step: Consulting (in progress) */}
          {workflowState.step === 'consulting' && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-gray-900 dark:text-white">
                Consulting {workflowState.plannedConsultations[workflowState.currentConsultationIndex - 1]?.agentName}...
              </span>
            </div>
          )}

          {/* Step: Confirm Consultation */}
          {workflowState.step === 'confirm_consultation' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Consultation {workflowState.currentConsultationIndex} of {workflowState.plannedConsultations.length} Complete
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {workflowState.currentConsultationIndex < workflowState.plannedConsultations.length ? (
                  <>
                    <strong>{workflowState.completedConsultations[workflowState.completedConsultations.length - 1]?.agentName}</strong> has responded.
                    Next: <strong>{workflowState.plannedConsultations[workflowState.currentConsultationIndex]?.agentName}</strong>
                  </>
                ) : (
                  <>All consultations complete! Ready to synthesize final response.</>
                )}
              </p>
              
              {/* Feedback section */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provide feedback to revise this response (optional):
                </label>
                <textarea
                  value={workflowState.userFeedback}
                  onChange={(e) => setWorkflowState(prev => ({ ...prev, userFeedback: e.target.value }))}
                  placeholder="E.g., 'Make it more concise', 'Add more examples', 'Change the tone to be more professional'..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                {workflowState.userFeedback.trim() && (
                  <button
                    onClick={reExecuteWithFeedback}
                    disabled={workflowState.isReExecuting}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {workflowState.isReExecuting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Revising...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Revise with Feedback
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={executeNextConsultation}
                  disabled={workflowState.isReExecuting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {workflowState.currentConsultationIndex < workflowState.plannedConsultations.length ? (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Continue to Next Agent
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Generate Final Response
                    </>
                  )}
                </button>
                <button
                  onClick={() => setWorkflowState(prev => ({ ...prev, active: false, step: 'idle' }))}
                  disabled={workflowState.isReExecuting}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step: Synthesis (in progress) */}
          {workflowState.step === 'synthesis' && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-gray-900 dark:text-white">
                Synthesizing final response from all consultations...
              </span>
            </div>
          )}

          {/* Step: Confirm Synthesis */}
          {workflowState.step === 'confirm_synthesis' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ready to Synthesize Final Response
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                All {workflowState.completedConsultations.length} consultations are complete. I will now synthesize their insights into a comprehensive response.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={generateFinalResponse}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Final Response
                </button>
                <button
                  onClick={() => setWorkflowState(prev => ({ ...prev, active: false, step: 'idle' }))}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto Mode Toggle */}
      <div className="mb-2 flex items-center justify-end gap-2 px-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Mode</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={autoMode}
              onChange={(e) => setAutoMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-green-600 peer-focus:ring-2 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 transition-colors"></div>
            <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
          </div>
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {autoMode ? '(Full auto flow)' : '(Manual approval each step)'}
        </span>
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isSending || workflowState.active}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!userMessage.trim() || isSending || workflowState.active}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
