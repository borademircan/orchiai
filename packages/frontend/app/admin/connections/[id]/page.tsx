'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { providerConnectionsApi } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2, TestTube } from 'lucide-react';

interface ProviderConnection {
  id: string;
  name: string;
  type?: string;
  metadata?: Record<string, any>;
}

export default function EditConnectionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Fetch connection
  const { data: connectionData, isLoading } = useQuery({
    queryKey: ['provider-connection', id],
    queryFn: () => providerConnectionsApi.get(id),
    enabled: !!id,
  });

  const connection: ProviderConnection = (connectionData as any)?.data;

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    apiKey: '',
    endpoint: '',
    metadata: '',
  });

  // Update form when connection loads
  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        type: connection.type || '',
        apiKey: '', // Never pre-fill API key for security
        endpoint: (connection as any).endpoint || '',
        metadata: connection.metadata ? JSON.stringify(connection.metadata, null, 2) : '',
      });
    }
  }, [connection]);

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: (data: { type?: string; apiKey: string; endpoint?: string }) => 
      providerConnectionsApi.test({ type: data.type, apiKey: data.apiKey, endpoint: data.endpoint }),
    onSuccess: (data) => {
      const result = (data as any)?.data;
      setTestResult(result);
      setIsTesting(false);
      if (result?.success) {
        // Clear test result after 3 seconds on success
        setTimeout(() => setTestResult(null), 3000);
      }
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: error?.message || 'Connection test failed',
      });
      setIsTesting(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => providerConnectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-connections'] });
      queryClient.invalidateQueries({ queryKey: ['provider-connection', id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => providerConnectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-connections'] });
      router.push('/admin/connections');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and parse metadata JSON if provided
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

    const updateData: any = {
      name: formData.name,
    };

    // Only include API key if it was changed (not empty)
    if (formData.apiKey.trim()) {
      updateData.apiKey = formData.apiKey;
    }

    // Include type and endpoint (can be empty to clear them)
    if (formData.type !== undefined) {
      updateData.type = formData.type.trim() || undefined;
    }
    updateData.endpoint = formData.endpoint.trim() || undefined;

    // Only include metadata if it was provided
    if (parsedMetadata) {
      updateData.metadata = parsedMetadata;
    }

    updateMutation.mutate(updateData);
  };

  const handleTest = () => {
    // Use the API key from form if provided, otherwise we can't test
    const apiKeyToTest = formData.apiKey.trim();
    if (!apiKeyToTest) {
      setTestResult({
        success: false,
        message: 'Please enter a new API key to test, or the connection will use the existing key',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    testMutation.mutate({
      type: formData.type.trim() || connection.type || undefined,
      apiKey: apiKeyToTest,
      endpoint: formData.endpoint.trim() || undefined,
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

  if (!connection) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Connection not found</p>
        <Link
          href="/admin/connections"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Connections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/connections"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Connections
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Edit Connection
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Update connection configuration
            </p>
          </div>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
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
              Connection Name <span className="text-red-500">*</span>
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

          {/* Connection Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Connection Type (Optional)
            </label>
            <input
              type="text"
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., openai, http, oauth2, custom"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Optional: Specify the connection type for categorization.
            </p>
          </div>

          {/* API Key */}
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Leave empty to keep current key"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to keep the current API key. Enter a new key to update it.
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
              type="url"
              id="endpoint"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="https://api.example.com/v1"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Optional custom API endpoint URL for self-hosted or custom providers. Leave empty to use default endpoints.
            </p>
          </div>

          {/* Metadata */}
          <div>
            <label
              htmlFor="metadata"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Metadata (Optional)
            </label>
            <textarea
              id="metadata"
              rows={6}
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
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Optional JSON metadata for additional configuration.
            </p>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`p-3 rounded-lg text-sm ${
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {testResult.success ? '✅ ' : '❌ '}
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/admin/connections"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !formData.apiKey.trim()}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4" />
                Test Connection
              </>
            )}
          </button>
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
              Delete Connection
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this connection? This action cannot be undone. Models using this connection will need to be updated.
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

