'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { triggersApi, agentsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
}

export default function NewTriggerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    type: 'CHAT',
    agentId: '',
    config: {} as Record<string, any>,
    secretToken: '',
    isEnabled: true,
  });

  // Fetch agents for dropdown
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ limit: 100 }),
  });

  const agents: Agent[] = (agentsData as any)?.data || [];

  // Update config based on type
  const updateConfigForType = (type: string) => {
    let newConfig: Record<string, any> = {};
    switch (type) {
      case 'CHAT':
        newConfig = { route: '/chat' };
        break;
      case 'WEBHOOK':
        newConfig = { url: '' };
        break;
      case 'SCHEDULED':
        newConfig = { cron: '0 0 * * *' };
        break;
    }
    setFormData({ ...formData, type, config: newConfig });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => triggersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      router.push('/admin/triggers');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      secretToken: formData.secretToken || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/triggers"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Triggers
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Create New Trigger
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Configure a trigger to execute an agent
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-6">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Trigger Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Customer Support Chat"
            />
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Trigger Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              required
              value={formData.type}
              onChange={(e) => updateConfigForType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CHAT">Chat - Respond to chat messages</option>
              <option value="WEBHOOK">Webhook - HTTP webhook trigger</option>
              <option value="SCHEDULED">Scheduled - Cron-based execution</option>
            </select>
          </div>

          {/* Agent */}
          <div>
            <label
              htmlFor="agentId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Agent <span className="text-red-500">*</span>
            </label>
            <select
              id="agentId"
              required
              value={formData.agentId}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an agent</option>
              {agents
                .filter((a) => a.isActive)
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Type-specific Config */}
          {formData.type === 'CHAT' && (
            <div>
              <label
                htmlFor="chatRoute"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Chat Route <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="chatRoute"
                required
                value={formData.config.route || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, route: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/chat"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                The route path for chat messages (e.g., /chat, /support).
              </p>
            </div>
          )}

          {formData.type === 'WEBHOOK' && (
            <>
              <div>
                <label
                  htmlFor="webhookUrl"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Webhook URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="webhookUrl"
                  required
                  value={formData.config.url || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, url: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="https://api.example.com/webhook"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  The URL where webhook requests will be sent.
                </p>
              </div>
              <div>
                <label
                  htmlFor="secretToken"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Secret Token (Optional)
                </label>
                <input
                  type="text"
                  id="secretToken"
                  value={formData.secretToken}
                  onChange={(e) => setFormData({ ...formData, secretToken: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Leave empty to auto-generate"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Secret token for webhook signature validation. Leave empty to auto-generate.
                </p>
              </div>
            </>
          )}

          {formData.type === 'SCHEDULED' && (
            <div>
              <label
                htmlFor="cronExpression"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Cron Expression <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cronExpression"
                required
                value={formData.config.cron || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, cron: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="0 0 * * *"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Cron expression for scheduling (e.g., &quot;0 0 * * *&quot; for daily at midnight).
                <br />
                Format: minute hour day month day-of-week
              </p>
            </div>
          )}

          {/* Enabled Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isEnabled"
              checked={formData.isEnabled}
              onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="isEnabled"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Trigger is enabled
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/admin/triggers"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Trigger'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

