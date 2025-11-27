'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toolsApi, providerConnectionsApi } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

interface ProviderConnection {
  id: string;
  name: string;
  provider: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  endpoint?: string;
  method: string;
  schema: Record<string, any>;
  connectionId?: string;
  isActive: boolean;
}

export default function EditToolPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Fetch tool
  const { data: toolData, isLoading } = useQuery({
    queryKey: ['tool', id],
    queryFn: () => toolsApi.get(id),
    enabled: !!id,
  });

  const tool: Tool = (toolData as any)?.data;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'CUSTOM',
    endpoint: '',
    method: 'POST',
    schema: '{}',
    connectionId: '',
    isActive: true,
  });

  // Update form when tool loads
  useEffect(() => {
    if (tool) {
      setFormData({
        name: tool.name,
        description: tool.description,
        type: tool.type,
        endpoint: tool.endpoint || '',
        method: tool.method,
        schema: JSON.stringify(tool.schema, null, 2),
        connectionId: tool.connectionId || '',
        isActive: tool.isActive,
      });
    }
  }, [tool]);

  // Fetch provider connections for dropdown
  const { data: connectionsData } = useQuery({
    queryKey: ['provider-connections'],
    queryFn: () => providerConnectionsApi.list({ limit: 100 }),
  });

  const connections: ProviderConnection[] = (connectionsData as any)?.data || [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => toolsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['tool', id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => toolsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      router.push('/admin/tools');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and parse schema JSON
    let parsedSchema;
    try {
      parsedSchema = JSON.parse(formData.schema);
      setSchemaError(null);
    } catch (error) {
      setSchemaError('Invalid JSON schema');
      return;
    }

    updateMutation.mutate({
      ...formData,
      endpoint: formData.endpoint || undefined,
      connectionId: formData.connectionId || undefined,
      schema: parsedSchema,
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

  if (!tool) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Tool not found</p>
        <Link
          href="/admin/tools"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Tools
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/tools"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Edit Tool
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Update tool configuration
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
              Tool Name <span className="text-red-500">*</span>
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

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type (read-only) */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Tool Type
            </label>
            <input
              type="text"
              id="type"
              value={formData.type}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Tool type cannot be changed after creation.
            </p>
          </div>

          {/* Endpoint */}
          <div>
            <label
              htmlFor="endpoint"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Endpoint URL (Optional)
            </label>
            <input
              type="url"
              id="endpoint"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          {/* Method */}
          <div>
            <label
              htmlFor="method"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              HTTP Method
            </label>
            <select
              id="method"
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Schema */}
          <div>
            <label
              htmlFor="schema"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Schema (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="schema"
              required
              rows={10}
              value={formData.schema}
              onChange={(e) => {
                setFormData({ ...formData, schema: e.target.value });
                setSchemaError(null);
              }}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 font-mono text-sm ${
                schemaError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
            />
            {schemaError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{schemaError}</p>
            )}
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
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.provider})
                </option>
              ))}
            </select>
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
              Tool is active
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/admin/tools"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending || !!schemaError}
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
              Delete Tool
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;{tool.name}&quot;? This action cannot be undone.
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

