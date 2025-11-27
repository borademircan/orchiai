'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsApi, modelsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
}

export default function NewAgentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    modelId: '',
    memoryStrategy: 'AUTO',
    memoryThreshold: 1000,
    askBeforeSaving: false,
  });

  // Fetch models for dropdown
  const { data: modelsData } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.list({ limit: 100 }),
  });

  const models: Model[] = (modelsData as any)?.data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => agentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      router.push('/admin/agents');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      modelId: formData.modelId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/agents"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Create New Agent
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Configure a new AI agent with instructions and settings
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
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Customer Support Agent"
            />
          </div>

          {/* Instructions */}
          <div>
            <label
              htmlFor="instructions"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              id="instructions"
              required
              rows={8}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="You are a helpful assistant. Respond to user queries in a friendly and professional manner..."
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Define how the agent should behave and respond to users.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label
              htmlFor="modelId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Model
            </label>
            <select
              id="modelId"
              value={formData.modelId}
              onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a model (optional)</option>
              {models
                .filter((m) => m.isActive)
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Choose the LLM model this agent will use. If not selected, a default will be used.
            </p>
          </div>

          {/* Memory Strategy */}
          <div>
            <label
              htmlFor="memoryStrategy"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Memory Strategy
            </label>
            <select
              id="memoryStrategy"
              value={formData.memoryStrategy}
              onChange={(e) => setFormData({ ...formData, memoryStrategy: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AUTO">Auto - Automatically save memories</option>
              <option value="ASK_USER">Ask User - Prompt before saving</option>
              <option value="MANUAL_ONLY">Manual Only - No automatic saving</option>
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Control how the agent manages its memory.
            </p>
          </div>

          {/* Memory Threshold */}
          <div>
            <label
              htmlFor="memoryThreshold"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Memory Threshold
            </label>
            <input
              type="number"
              id="memoryThreshold"
              min="1"
              value={formData.memoryThreshold}
              onChange={(e) =>
                setFormData({ ...formData, memoryThreshold: parseInt(e.target.value) || 1000 })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Maximum number of memory items before summarization (default: 1000).
            </p>
          </div>

          {/* Ask Before Saving */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="askBeforeSaving"
              checked={formData.askBeforeSaving}
              onChange={(e) => setFormData({ ...formData, askBeforeSaving: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="askBeforeSaving"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Ask before saving memories
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/admin/agents"
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
              'Create Agent'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

