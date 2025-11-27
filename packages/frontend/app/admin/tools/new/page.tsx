'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toolsApi, providerConnectionsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface ProviderConnection {
  id: string;
  name: string;
  provider: string;
}

export default function NewToolPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'CUSTOM',
    endpoint: '',
    method: 'POST',
    schema: '{\n  "type": "object",\n  "properties": {}\n}',
    connectionId: '',
    isActive: true,
  });
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Fetch provider connections for dropdown
  const { data: connectionsData } = useQuery({
    queryKey: ['provider-connections'],
    queryFn: () => providerConnectionsApi.list({ limit: 100 }),
  });

  const connections: ProviderConnection[] = (connectionsData as any)?.data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => toolsApi.create(data),
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

    createMutation.mutate({
      ...formData,
      endpoint: formData.endpoint || undefined,
      connectionId: formData.connectionId || undefined,
      schema: parsedSchema,
    });
  };

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Register New Tool
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Configure a new external tool or integration
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
              Tool Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Send Email Tool"
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
              placeholder="Describe what this tool does..."
            />
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Tool Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SEEDREAM">Seedream</option>
              <option value="VEO">Veo</option>
              <option value="CRM">CRM</option>
              <option value="EMAIL">Email</option>
              <option value="SOCIAL">Social</option>
              <option value="WEBHOOK">Webhook</option>
              <option value="CUSTOM">Custom</option>
            </select>
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
              placeholder="https://api.example.com/tool"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              HTTP endpoint URL for the tool. Required for execution.
            </p>
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
              placeholder='{"type": "object", "properties": {...}}'
            />
            {schemaError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{schemaError}</p>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              JSON schema defining the tool&apos;s input parameters. Must be valid JSON.
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
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.provider})
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Select a provider connection for authentication if needed.
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
            disabled={createMutation.isPending || !!schemaError}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Tool'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

