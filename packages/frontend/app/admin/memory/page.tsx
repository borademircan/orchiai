'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memoriesApi, agentsApi } from '@/lib/api';
import Link from 'next/link';
import {
  Database,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
}

interface MemoryItem {
  id: string;
  agentId: string;
  type: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
  agent?: {
    id: string;
    name: string;
  };
}

export default function MemoryInspectorPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showExpired, setShowExpired] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());

  // Fetch agents for filter
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ limit: 100 }),
  });

  const agents: Agent[] = (agentsData as any)?.data || [];

  // Fetch memories
  const { data: memoriesData, isLoading } = useQuery({
    queryKey: ['memories', filterAgent, filterType, search, showExpired],
    queryFn: () => {
      const params: any = { limit: 100 };
      if (filterAgent !== 'all') {
        params.agentId = filterAgent;
      }
      if (filterType !== 'all') {
        params.type = filterType;
      }
      if (search) {
        params.search = search;
      }
      if (showExpired) {
        params.includeExpired = true;
      }
      return memoriesApi.list(params);
    },
  });

  const memories: MemoryItem[] = (memoriesData as any)?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => memoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      setDeleteConfirm(null);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => memoriesApi.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      setSelectedMemories(new Set());
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const toggleSelectMemory = (id: string) => {
    const newSelected = new Set(selectedMemories);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMemories(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedMemories.size === memories.length) {
      setSelectedMemories(new Set());
    } else {
      setSelectedMemories(new Set(memories.map((m) => m.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedMemories.size === 0) return;
    if (confirm(`Delete ${selectedMemories.size} memor${selectedMemories.size === 1 ? 'y' : 'ies'}?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedMemories));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SHORT_TERM':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'LONG_TERM':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SUMMARY':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Memory Inspector
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            View and manage agent memories
          </p>
        </div>
        <Link
          href="/admin/memory/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          <Plus className="h-4 w-4" />
          Add Memory
        </Link>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agents</option>
            {agents
              .filter((a) => a.isActive)
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="SHORT_TERM">Short Term</option>
            <option value="LONG_TERM">Long Term</option>
            <option value="SUMMARY">Summary</option>
          </select>
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show Expired</span>
          </label>
        </div>

        {/* Bulk Actions Bar */}
        {memories.length > 0 && (
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {selectedMemories.size === memories.length ? (
                <CheckSquare className="h-5 w-5 text-blue-600" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              <span>
                {selectedMemories.size === memories.length
                  ? 'Deselect All'
                  : 'Select All'}
              </span>
            </button>

            {selectedMemories.size > 0 && (
              <>
                <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedMemories.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkDeleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Selected
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Memories List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center p-12">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {search ? 'No memories found matching your search.' : 'No memories yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectMemory(memory.id)}
                    className="flex-shrink-0 mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {selectedMemories.has(memory.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${getTypeColor(memory.type)}`}
                        >
                          {memory.type.replace('_', ' ')}
                        </span>
                        {memory.agent && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {memory.agent.name}
                          </span>
                        )}
                        {memory.expiresAt && (
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isExpired(memory.expiresAt)
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {isExpired(memory.expiresAt) ? 'Expired' : 'Expires'}:{' '}
                            {formatDate(memory.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {memory.content}
                    </p>
                    {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                          Metadata
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                          {JSON.stringify(memory.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Created: {formatDate(memory.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/memory/${memory.id}`}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(memory.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
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

