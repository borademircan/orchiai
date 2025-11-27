'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { memoriesApi } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

interface MemoryItem {
  id: string;
  agentId: string;
  type: string;
  content: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
}

export default function EditMemoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Fetch memory
  const { data: memoryData, isLoading } = useQuery({
    queryKey: ['memory', id],
    queryFn: () => memoriesApi.get(id),
    enabled: !!id,
  });

  const memory: MemoryItem = (memoryData as any)?.data;

  const [formData, setFormData] = useState({
    content: '',
    expiresAt: '',
    metadata: '',
  });

  // Update form when memory loads
  useEffect(() => {
    if (memory) {
      const expiresAtValue = memory.expiresAt
        ? new Date(memory.expiresAt).toISOString().slice(0, 16)
        : '';
      setFormData({
        content: memory.content,
        expiresAt: expiresAtValue,
        metadata: memory.metadata ? JSON.stringify(memory.metadata, null, 2) : '',
      });
    }
  }, [memory]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => memoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['memory', id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => memoriesApi.delete(id),
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

    updateMutation.mutate({
      content: formData.content,
      expiresAt: formData.expiresAt || null,
      metadata: parsedMetadata,
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

  if (!memory) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Memory not found</p>
        <Link
          href="/admin/memory"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Memory Inspector
        </Link>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Edit Memory
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Update memory content and settings
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
          {/* Type (read-only) */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Memory Type
            </label>
            <input
              type="text"
              id="type"
              value={memory.type.replace('_', ' ')}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Memory type cannot be changed after creation.
            </p>
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
            />
          </div>

          {/* Expires At */}
          <div>
            <label
              htmlFor="expiresAt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Expires At
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Set expiration date or leave empty for permanent memory.
            </p>
          </div>

          {/* Metadata */}
          <div>
            <label
              htmlFor="metadata"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Metadata (JSON)
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
            />
            {metadataError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{metadataError}</p>
            )}
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
            disabled={updateMutation.isPending || !!metadataError}
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
              Delete Memory
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this memory? This action cannot be undone.
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

