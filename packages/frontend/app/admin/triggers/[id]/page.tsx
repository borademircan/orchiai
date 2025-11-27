'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { triggersApi, agentsApi } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
}

interface Trigger {
  id: string;
  name: string;
  type: string;
  agentId: string;
  config: Record<string, any>;
  isEnabled: boolean;
  secretToken?: string;
}

export default function EditTriggerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Fetch trigger
  const { data: triggerData, isLoading } = useQuery({
    queryKey: ['trigger', id],
    queryFn: () => triggersApi.get(id),
    enabled: !!id,
  });

  const trigger: Trigger = (triggerData as any)?.data;

  const [formData, setFormData] = useState({
    name: '',
    type: 'CHAT',
    agentId: '',
    config: {} as Record<string, any>,
    secretToken: '',
    isEnabled: true,
  });

  // Update form when trigger loads
  useEffect(() => {
    if (trigger) {
      setFormData({
        name: trigger.name,
        type: trigger.type,
        agentId: trigger.agentId,
        config: trigger.config || {},
        secretToken: trigger.secretToken || '',
        isEnabled: trigger.isEnabled,
      });
    }
  }, [trigger]);

  // Fetch agents for dropdown
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ limit: 100 }),
  });

  const agents: Agent[] = (agentsData as any)?.data || [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => triggersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      queryClient.invalidateQueries({ queryKey: ['trigger', id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => triggersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      router.push('/admin/triggers');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      secretToken: formData.secretToken || undefined,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!trigger) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Trigger not found</p>
        <Link
          href="/admin/triggers"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Triggers
        </Link>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Edit Trigger
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Update trigger configuration
            </p>
          </div>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
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
            />
          </div>

          {/* Type (read-only) */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Trigger Type
            </label>
            <input
              type="text"
              id="type"
              value={formData.type}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Trigger type cannot be changed after creation.
            </p>
          </div>

          {/* Agent (read-only) */}
          <div>
            <label
              htmlFor="agentId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Agent
            </label>
            <input
              type="text"
              id="agentId"
              value={agents.find((a) => a.id === formData.agentId)?.name || 'Unknown'}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Agent cannot be changed after creation.
            </p>
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
                value={formData.config.route || formData.config.path || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, route: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                />
              </div>
              <div>
                <label
                  htmlFor="secretToken"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Secret Token
                </label>
                <input
                  type="text"
                  id="secretToken"
                  value={formData.secretToken}
                  onChange={(e) => setFormData({ ...formData, secretToken: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Leave empty to keep current or auto-generate"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Secret token for webhook signature validation. Leave empty to keep current token.
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
                value={formData.config.cron || formData.config.schedule || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, cron: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Cron expression format: minute hour day month day-of-week
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
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Trigger
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;{trigger.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

