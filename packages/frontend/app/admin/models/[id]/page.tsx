'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { modelsApi, providerConnectionsApi } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

interface ProviderConnection {
  id: string;
  name: string;
  type?: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  endpoint?: string;
  temperature: number;
  maxTokens: number;
  connectionId?: string;
  isActive: boolean;
}

export default function EditModelPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Fetch model
  const { data: modelData, isLoading } = useQuery({
    queryKey: ['model', id],
    queryFn: () => modelsApi.get(id),
    enabled: !!id,
  });

  const model: Model = (modelData as any)?.data;

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

  // Update form when model loads
  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name,
        provider: model.provider,
        modelId: model.modelId,
        endpoint: model.endpoint || '',
        temperature: model.temperature,
        maxTokens: model.maxTokens,
        connectionId: model.connectionId || '',
        isActive: model.isActive,
      });
    }
  }, [model]);

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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => modelsApi.update(id, data),
    onSuccess: () => {
      console.log('[Models] Update successful');
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['model', id] });
      alert('Model updated successfully!');
      router.push('/admin/models');
    },
    onError: (error: any) => {
      console.error('[Models] Update failed:', error);
      alert(`Failed to update model: ${error?.error?.message || error.message || 'Unknown error'}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => modelsApi.delete(id),
    onSuccess: () => {
      console.log('[Models] Delete successful');
      queryClient.invalidateQueries({ queryKey: ['models'] });
      alert('Model deleted successfully!');
      router.push('/admin/models');
    },
    onError: (error: any) => {
      console.error('[Models] Delete failed:', error);
      alert(`Failed to delete model: ${error?.error?.message || error.message || 'Unknown error'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      endpoint: formData.endpoint || undefined,
      connectionId: formData.connectionId || undefined,
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

  if (!model) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Model not found</p>
        <Link
          href="/admin/models"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Models
        </Link>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Edit Model
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Update model configuration
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
              Model Name <span className="text-red-500">*</span>
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

          {/* Provider (read-only) */}
          <div>
            <label
              htmlFor="provider"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Provider
            </label>
            <input
              type="text"
              id="provider"
              value={formData.provider}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Provider cannot be changed after creation.
            </p>
          </div>

          {/* Model ID (read-only) */}
          <div>
            <label
              htmlFor="modelId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Model ID
            </label>
            <input
              type="text"
              id="modelId"
              value={formData.modelId}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-mono text-sm cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Model ID cannot be changed after creation.
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
            />
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
              Delete Model
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;{model.name}&quot;? This action cannot be undone.
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

