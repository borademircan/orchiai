'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { modelsApi, providerConnectionsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface ProviderConnection {
  id: string;
  name: string;
  type?: string;
}

export default function NewModelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    provider: 'OPENAI',
    modelId: '',
    endpoint: '',
    temperature: 0.7,
    maxTokens: 4000,
    connectionId: '',
    isActive: true,
  });

  // Fetch provider connections for dropdown
  const { data: connectionsData } = useQuery({
    queryKey: ['provider-connections'],
    queryFn: () => providerConnectionsApi.list({ limit: 100 }),
  });

  const connections: ProviderConnection[] = (connectionsData as any)?.data || [];

  // Map provider to connection type for filtering
  // Provider names in Model are uppercase (OPENAI, ANTHROPIC, GOOGLE)
  // Connection types are lowercase or mixed (apiKey, oauth2, etc.)
  // For now, show all connections in the dropdown
  const filteredConnections = connections;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => modelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      router.push('/admin/models');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      endpoint: formData.endpoint || undefined,
      connectionId: formData.connectionId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/models"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Models
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Add New Model
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Configure a new LLM model profile
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
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., GPT-4 Turbo"
            />
          </div>

          {/* Provider */}
          <div>
            <label
              htmlFor="provider"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Provider <span className="text-red-500">*</span>
            </label>
            <select
              id="provider"
              required
              value={formData.provider}
              onChange={(e) => {
                setFormData({ ...formData, provider: e.target.value, connectionId: '' });
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="OPENAI">OpenAI</option>
              <option value="ANTHROPIC">Anthropic</option>
              <option value="GOOGLE">Google</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          {/* Model ID */}
          <div>
            <label
              htmlFor="modelId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Model ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="modelId"
              required
              value={formData.modelId}
              onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="e.g., gpt-4-turbo-preview, claude-3-5-sonnet-20240620"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              The model identifier from the provider (e.g., gpt-4, claude-3-opus-20240229).
            </p>
          </div>

          {/* Endpoint */}
          <div>
            <label
              htmlFor="endpoint"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Custom Endpoint (Optional)
            </label>
            <input
              type="text"
              id="endpoint"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.openai.com/v1 (leave empty for default)"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Custom API endpoint URL. Leave empty to use provider default.
            </p>
          </div>

          {/* Connection */}
          <div>
            <label
              htmlFor="connectionId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Provider Connection (Optional)
            </label>
            <select
              id="connectionId"
              value={formData.connectionId}
              onChange={(e) => setFormData({ ...formData, connectionId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a connection (optional)</option>
              {filteredConnections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Select a provider connection with API keys. If not selected, you&apos;ll need to configure it later.
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label
              htmlFor="temperature"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Temperature: {formData.temperature}
            </label>
            <input
              type="range"
              id="temperature"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Controls randomness (0 = deterministic, 2 = very creative). Default: 0.7
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label
              htmlFor="maxTokens"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Max Tokens <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="maxTokens"
              required
              min="1"
              value={formData.maxTokens}
              onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 4000 })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Maximum number of tokens in the response. Default: 4000
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="isActive"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Model is active
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/admin/models"
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
              'Create Model'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

