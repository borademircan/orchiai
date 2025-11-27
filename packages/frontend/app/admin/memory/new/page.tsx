'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { memoriesApi, agentsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
}

export default function NewMemoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    agentId: '',
    type: 'SHORT_TERM',
    content: '',
    expiresAt: '',
    metadata: '',
  });
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Fetch agents for dropdown
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ limit: 100 }),
  });

  const agents: Agent[] = (agentsData as any)?.data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => memoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      router.push('/admin/memory');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and parse metadata JSON
    let parsedMetadata;
    if (formData.metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(formData.metadata);
        setMetadataError(null);
      } catch (error) {
        setMetadataError('Invalid JSON metadata');
        return;
      }
    }

    createMutation.mutate({
      agentId: formData.agentId,
      type: formData.type,
      content: formData.content,
      expiresAt: formData.expiresAt || undefined,
      metadata: parsedMetadata,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/memory"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Memory Inspector
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Add Memory
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Create a new memory item for an agent
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-6">
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

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Memory Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SHORT_TERM">Short Term - Temporary memory</option>
              <option value="LONG_TERM">Long Term - Persistent memory</option>
              <option value="SUMMARY">Summary - Summarized memory</option>
            </select>
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              required
              rows={6}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter memory content..."
            />
          </div>

          {/* Expires At */}
          <div>
            <label
              htmlFor="expiresAt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Expires At (Optional)
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Optional expiration date for this memory. Leave empty for permanent memory.
            </p>
          </div>

          {/* Metadata */}
          <div>
            <label
              htmlFor="metadata"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Metadata (JSON, Optional)
            </label>
            <textarea
              id="metadata"
              rows={4}
              value={formData.metadata}
              onChange={(e) => {
                setFormData({ ...formData, metadata: e.target.value });
                setMetadataError(null);
              }}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 font-mono text-sm ${
                metadataError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
              placeholder='{"key": "value"}'
            />
            {metadataError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{metadataError}</p>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Optional JSON metadata for additional context.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/admin/memory"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || !!metadataError}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Memory'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

