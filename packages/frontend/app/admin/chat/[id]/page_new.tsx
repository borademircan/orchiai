'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:invoke>
<invoke name="agentsApi" from '@/lib/api';
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
  AtSign,
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
  title?: string;
  startedAt: string;
  lastMessageAt: string;
  agent?: {
    id: string;
    name: string;
    orchestrationMode?: string;
  };
}

export default function ChatSessionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [userMessage, setUserMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [autoMode, setAutoMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orchiai_auto_mode');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });
  
  // @mention autocomplete
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: string; name: string }>>([]);

  // Save auto mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orchiai_auto_mode', String(autoMode));
    }
  }, [autoMode]);

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
    refetchInterval: 2000, // Poll every 2 seconds for new messages
  });

  const messages: ChatMessage[] = (messagesData as any)?.data || [];

  // Fetch available agents for @mention
  const { data: agentsData } = useQuery({
    queryKey: ['agents-list'],
    queryFn: () => agentsApi.list({ limit: 100 }),
  });

  useEffect(() => {
    const agents = (agentsData as any)?.data || [];
    setAvailableAgents(agents.filter((a: any) => a.isActive).map((a: any) => ({ id: a.id, name: a.name })));
  }, [agentsData]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect @mention in input
  useEffect(() => {
    if (userMessage.includes('@')) {
      const atIndex = userMessage.lastIndexOf('@');
      const afterAt = userMessage.substring(atIndex + 1);
      const spaceAfterAt = afterAt.indexOf(' ');
      
      if (spaceAfterAt === -1) {
        // Still typing the mention
        setMentionSearch(afterAt.toLowerCase());
        setShowMentionSuggestions(true);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  }, [userMessage]);

  // Filter agents for @mention
  const filteredAgents = availableAgents.filter(agent =>
    agent.name.toLowerCase().includes(mentionSearch)
  );

  // Insert @mention
  const insertMention = (agentName: string) => {
    const atIndex = userMessage.lastIndexOf('@');
    const before = userMessage.substring(0, atIndex);
    const after = userMessage.substring(atIndex);
    const afterSpace = after.indexOf(' ');
    const remaining = afterSpace === -1 ? '' : after.substring(afterSpace);
    
    setUserMessage(`${before}@${agentName} ${remaining}`);
    setShowMentionSuggestions(false);
    inputRef.current?.focus();
  };

  // Send conversational message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Save user message first
      await chatApi.createMessage({
        sessionId: id,
        role: 'USER',
        content,
      });
      
      // Refresh to show user message
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });

      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
      }));

      // Send to conversational API
      const result = (await agentsApi.sendConversationalMessage({
        message: content,
        sessionId: id,
        agentId: session.agentId,
        conversationHistory,
        autoMode,
      })) as any;

      // Save all returned messages
      for (const msg of result.data.messages) {
        await chatApi.createMessage({
          sessionId: id,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata,
        });
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', id] });
      setUserMessage('');
      setIsSending(false);
    },
    onError: (error: any) => {
      console.error('[Chat] Failed to send message:', error);
      alert(`Failed to send message: ${error.message || 'Unknown error'}`);
      setIsSending(false);
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessage.trim() || isSending) return;

    setIsSending(true);
    sendMessageMutation.mutate(userMessage);
  };

  if (sessionLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/chat"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {session.title || 'Chat Session'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <Bot className="h-4 w-4 inline mr-1" />
              {session.agent?.name} 
              {session.agent?.orchestrationMode && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                  {session.agent.orchestrationMode} Mode
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-4">
        <div className="h-[60vh] overflow-y-auto p-6 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <Bot className="h-12 w-12 mb-3 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
              {!autoMode && (
                <p className="text-sm mt-2">
                  Tip: Use @AgentName to talk to specific agents directly
                </p>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role !== 'USER' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-lg px-4 py-3 ${
                    message.role === 'USER'
                      ? 'bg-blue-600 text-white'
                      : message.metadata?.isOrchestratorPrompt
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 border-2 border-purple-300 dark:border-purple-700'
                      : message.metadata?.isMentionResponse
                      ? 'bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-white border border-green-300 dark:border-green-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {message.metadata?.agentName && message.role !== 'USER' && (
                    <div className="text-xs font-semibold mb-1 opacity-75">
                      {message.metadata.agentName}
                      {message.metadata.isOrchestratorPrompt && ' (Orchestrator)'}
                    </div>
                  )}
                  
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {message.role === 'USER' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-600 dark:bg-gray-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

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
          {autoMode ? '(Full auto)' : '(Conversational)'}
        </span>
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 relative">
        {/* @mention suggestions */}
        {showMentionSuggestions && filteredAgents.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredAgents.map(agent => (
              <button
                key={agent.id}
                onClick={() => insertMention(agent.name)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <AtSign className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{agent.name}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder={autoMode ? "Type your message..." : "Type your message or use @AgentName..."}
            disabled={isSending}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!userMessage.trim() || isSending}
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

