'use client';

import { useQuery } from '@tanstack/react-query';
import { agentsApi, modelsApi, toolsApi, triggersApi, memoriesApi } from '@/lib/api';
import Link from 'next/link';
import {
  Bot,
  Cpu,
  Wrench,
  Zap,
  Database,
  Activity,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  // Fetch all data in parallel
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents', 'dashboard'],
    queryFn: () => agentsApi.list({ limit: 100 }),
  });

  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['models', 'dashboard'],
    queryFn: () => modelsApi.list({ limit: 100 }),
  });

  const { data: toolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ['tools', 'dashboard'],
    queryFn: () => toolsApi.list({ limit: 100 }),
  });

  const { data: triggersData, isLoading: triggersLoading } = useQuery({
    queryKey: ['triggers', 'dashboard'],
    queryFn: () => triggersApi.list({ limit: 100 }),
  });

  const { data: memoriesData, isLoading: memoriesLoading } = useQuery({
    queryKey: ['memories', 'dashboard'],
    queryFn: () => memoriesApi.list({ limit: 10 }),
  });

  // Process data
  const agents = (agentsData as any)?.data || [];
  const models = (modelsData as any)?.data || [];
  const tools = (toolsData as any)?.data || [];
  const triggers = (triggersData as any)?.data || [];
  const recentMemories = (memoriesData as any)?.data || [];

  const activeAgents = agents.filter((a: any) => a.isActive)?.length || 0;
  const totalAgents = agents.length || 0;
  const activeModels = models.filter((m: any) => m.isActive)?.length || 0;
  const totalModels = models.length || 0;
  const activeTools = tools.filter((t: any) => t.isActive)?.length || 0;
  const totalTools = tools.length || 0;
  const enabledTriggers = triggers.filter((t: any) => t.isEnabled)?.length || 0;
  const totalTriggers = triggers.length || 0;

  const isLoading =
    agentsLoading || modelsLoading || toolsLoading || triggersLoading || memoriesLoading;

  const stats = [
    {
      name: 'Total Agents',
      value: isLoading ? '...' : totalAgents,
      active: isLoading ? '...' : activeAgents,
      icon: Bot,
      color: 'bg-blue-500',
      href: '/admin/agents',
    },
    {
      name: 'Models',
      value: isLoading ? '...' : totalModels,
      active: isLoading ? '...' : activeModels,
      icon: Cpu,
      color: 'bg-purple-500',
      href: '/admin/models',
    },
    {
      name: 'Tools',
      value: isLoading ? '...' : totalTools,
      active: isLoading ? '...' : activeTools,
      icon: Wrench,
      color: 'bg-orange-500',
      href: '/admin/tools',
    },
    {
      name: 'Triggers',
      value: isLoading ? '...' : totalTriggers,
      active: isLoading ? '...' : enabledTriggers,
      icon: Zap,
      color: 'bg-yellow-500',
      href: '/admin/triggers',
    },
  ];

  // Get recent items (last 5 of each)
  const recentAgents = agents
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const recentModels = models
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const recentTools = tools
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Overview of your multi-agent orchestration system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`${stat.color} rounded-lg p-2 sm:p-3`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.name}
                      </p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                      {stat.active !== undefined && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {stat.active} active
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <div className="rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </h2>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {recentAgents.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Recent Agents
                  </h3>
                  <div className="space-y-2">
                    {recentAgents.map((agent: any) => (
                      <Link
                        key={agent.id}
                        href={`/admin/agents/${agent.id}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Bot className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900 dark:text-white truncate">
                            {agent.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatDate(agent.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {recentModels.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Recent Models
                  </h3>
                  <div className="space-y-2">
                    {recentModels.map((model: any) => (
                      <Link
                        key={model.id}
                        href={`/admin/models/${model.id}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Cpu className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900 dark:text-white truncate">
                            {model.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatDate(model.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {recentTools.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Recent Tools
                  </h3>
                  <div className="space-y-2">
                    {recentTools.map((tool: any) => (
                      <Link
                        key={tool.id}
                        href={`/admin/tools/${tool.id}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900 dark:text-white truncate">
                            {tool.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatDate(tool.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {recentAgents.length === 0 && recentModels.length === 0 && recentTools.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions & System Info */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Actions */}
          <div className="rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/agents/new"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Bot className="h-6 w-6 text-blue-500 mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  New Agent
                </span>
              </Link>
              <Link
                href="/admin/models/new"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Cpu className="h-6 w-6 text-purple-500 mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Add Model
                </span>
              </Link>
              <Link
                href="/admin/tools/new"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Wrench className="h-6 w-6 text-orange-500 mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Register Tool
                </span>
              </Link>
              <Link
                href="/admin/triggers/new"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Zap className="h-6 w-6 text-yellow-500 mb-2" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Create Trigger
                </span>
              </Link>
            </div>
          </div>

          {/* Recent Memories */}
          {recentMemories.length > 0 && (
            <div className="rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Recent Memories
                </h2>
                <Link
                  href="/admin/memory"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-2">
                {recentMemories.slice(0, 5).map((memory: any) => (
                  <Link
                    key={memory.id}
                    href={`/admin/memory/${memory.id}`}
                    className="block p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 flex-1">
                        {memory.content}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                        {formatDate(memory.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

