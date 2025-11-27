'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsApi, modelsApi } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2, Users, X, Plus, GripVertical, Pencil } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Model {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
}

interface Agent {
  id: string;
  name: string;
  instructions: string;
  modelId?: string;
  memoryStrategy: string;
  memoryThreshold: number;
  askBeforeSaving: boolean;
  isActive: boolean;
}

interface ConsultRule {
  id: string;
  agentId: string;
  consultedAgentId: string;
  whenCondition: string;
  conditionalRule?: string;
  purpose: string;
  order: number;
  consultedAgent: {
    id: string;
    name: string;
  };
  flowModePurpose?: string;
  qaModePurpose?: string;
}

// Sortable consultation item component
function SortableConsultItem({
  consult,
  onEdit,
  onRemove,
}: {
  consult: ConsultRule;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: consult.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-white">
          {consult.consultedAgent.name}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {consult.purpose}
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        title="Edit consultation"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        title="Remove consultation"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showAddConsult, setShowAddConsult] = useState(false);
  const [editingConsultId, setEditingConsultId] = useState<string | null>(null);
  const [selectedConsultAgent, setSelectedConsultAgent] = useState('');
  const [flowModePurpose, setFlowModePurpose] = useState('');
  const [qaModePurpose, setQaModePurpose] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch agent
  const { data: agentData, isLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.get(id),
    enabled: !!id,
  });

  const agent: Agent = (agentData as any)?.data;

  // Fetch consult rules
  const { data: consultsData } = useQuery({
    queryKey: ['agent-consults', id],
    queryFn: () => agentsApi.getConsults(id),
    enabled: !!id,
  });

  const consultRules: ConsultRule[] = (consultsData as any)?.data || [];

  // Fetch all agents for consult selection
  const { data: allAgentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list({ limit: 100, isActive: true }),
  });

  const allAgents: Agent[] = (allAgentsData as any)?.data || [];
  const availableAgents = allAgents.filter((a) =>
    a.id !== id && !consultRules.some((c) => c.consultedAgentId === a.id)
  );

  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    modelId: '',
    memoryStrategy: 'AUTO',
    memoryThreshold: 1000,
    askBeforeSaving: false,
    isActive: true,
  });

  // Update form when agent loads
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        instructions: agent.instructions,
        modelId: agent.modelId || '',
        memoryStrategy: agent.memoryStrategy,
        memoryThreshold: agent.memoryThreshold,
        askBeforeSaving: agent.askBeforeSaving,
        isActive: agent.isActive,
      });
    }
  }, [agent]);

  // Fetch models for dropdown
  const { data: modelsData } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.list({ limit: 100 }),
  });

  const models: Model[] = (modelsData as any)?.data || [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => agentsApi.update(id, data),
    onSuccess: () => {
      console.log('[Agent] Update successful');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', id] });
      alert('Agent updated successfully!');
    },
    onError: (error: any) => {
      console.error('[Agent] Update failed:', error);
      alert(`Failed to update agent: ${error?.error?.message || error.message || 'Unknown error'}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => agentsApi.delete(id),
    onSuccess: () => {
      console.log('[Agent] Delete successful');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      alert('Agent deleted successfully!');
      router.push('/admin/agents');
    },
    onError: (error: any) => {
      console.error('[Agent] Delete failed:', error);
      alert(`Failed to delete agent: ${error?.error?.message || error.message || 'Unknown error'}`);
    },
  });

  // Add consult mutation
  const addConsultMutation = useMutation({
    mutationFn: (data: { consultedAgentId: string; flowModePurpose: string; qaModePurpose: string }) => {
      // Combine both purposes for backward compatibility
      const combinedPurpose = `Flow Mode: ${data.flowModePurpose}\nQ&A Mode: ${data.qaModePurpose}`;

      return agentsApi.addConsult(id, {
        consultedAgentId: data.consultedAgentId,
        whenCondition: 'ALWAYS', // Default to always consult
        purpose: combinedPurpose,
        order: consultRules.length, // Add to end
      });
    },
    onSuccess: () => {
      console.log('[Agent] Consult added successfully');
      queryClient.invalidateQueries({ queryKey: ['agent-consults', id] });
      setShowAddConsult(false);
      setEditingConsultId(null);
      setSelectedConsultAgent('');
      setFlowModePurpose('');
      setQaModePurpose('');
    },
    onError: (error: any) => {
      console.error('[Agent] Failed to add consult:', error);
      alert(`Failed to add consultation: ${error?.error?.message || error.message || 'Unknown error'}`);
    },
  });

  // Update consult mutation
  const updateConsultMutation = useMutation({
    mutationFn: (data: { consultId: string; flowModePurpose: string; qaModePurpose: string }) => {
      const combinedPurpose = `Flow Mode: ${data.flowModePurpose}\nQ&A Mode: ${data.qaModePurpose}`;

      return agentsApi.updateConsult(id, data.consultId, {
        purpose: combinedPurpose,
      });
    },
    onSuccess: () => {
      console.log('[Agent] Consult updated successfully');
      queryClient.invalidateQueries({ queryKey: ['agent-consults', id] });
      setShowAddConsult(false);
      setEditingConsultId(null);
      setSelectedConsultAgent('');
      setFlowModePurpose('');
      setQaModePurpose('');
    },
    onError: (error: any) => {
      console.error('[Agent] Failed to update consult:', error);
      alert(`Failed to update consultation: ${error?.error?.message || error.message || 'Unknown error'}`);
    },
  });

  // Delete consult mutation
  const deleteConsultMutation = useMutation({
    mutationFn: (consultId: string) => agentsApi.deleteConsult(id, consultId),
    onSuccess: () => {
      console.log('[Agent] Consult removed successfully');
      queryClient.invalidateQueries({ queryKey: ['agent-consults', id] });
    },
    onError: (error: any) => {
      console.error('[Agent] Failed to remove consult:', error);
      alert(`Failed to remove consultation: ${error?.error?.message || error.message || 'Unknown error'}`);
    },
  });

  // Reorder consults mutation
  const reorderConsultsMutation = useMutation({
    mutationFn: (ruleIds: string[]) => agentsApi.reorderConsults(id, ruleIds),
    onSuccess: () => {
      console.log('[Agent] Consults reordered successfully');
      queryClient.invalidateQueries({ queryKey: ['agent-consults', id] });
    },
    onError: (error: any) => {
      console.error('[Agent] Failed to reorder consults:', error);
      alert(`Failed to reorder consultations: ${error?.error?.message || error.message || 'Unknown error'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      modelId: formData.modelId || undefined,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleAddConsult = () => {
    if (!selectedConsultAgent || !flowModePurpose.trim() || !qaModePurpose.trim()) {
      alert('Please select an agent and provide purposes for both Flow and Q&A modes');
      return;
    }

    if (editingConsultId) {
      // Update existing consult
      updateConsultMutation.mutate({
        consultId: editingConsultId,
        flowModePurpose,
        qaModePurpose,
      });
    } else {
      // Add new consult
      addConsultMutation.mutate({
        consultedAgentId: selectedConsultAgent,
        flowModePurpose,
        qaModePurpose,
      });
    }
  };

  const handleEditConsult = (consult: ConsultRule) => {
    // Parse the existing purpose to extract Flow and Q&A modes
    const flowMatch = consult.purpose.match(/Flow Mode:\s*(.+?)(?:\nQ&A Mode:|$)/s);
    const qaMatch = consult.purpose.match(/Q&A Mode:\s*(.+?)$/s);

    setEditingConsultId(consult.id);
    setSelectedConsultAgent(consult.consultedAgentId);
    setFlowModePurpose(flowMatch ? flowMatch[1].trim() : '');
    setQaModePurpose(qaMatch ? qaMatch[1].trim() : '');
    setShowAddConsult(true);
  };

  const handleRemoveConsult = (consultId: string) => {
    if (confirm('Are you sure you want to remove this consultation?')) {
      deleteConsultMutation.mutate(consultId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = consultRules.findIndex((rule) => rule.id === active.id);
    const newIndex = consultRules.findIndex((rule) => rule.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(consultRules, oldIndex, newIndex);
      const ruleIds = newOrder.map((rule) => rule.id);
      reorderConsultsMutation.mutate(ruleIds);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Agent not found</p>
        <Link
          href="/admin/agents"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to Agents
        </Link>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Edit Agent
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Update agent configuration and settings
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
              Agent Name <span className="text-red-500">*</span>
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
            />
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
              Agent is active
            </label>
          </div>
        </div>

        {/* Agent Consultations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Agent Consultations
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddConsult(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Consult
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure which agents this agent can consult during execution to enhance its responses.
          </p>

          {consultRules.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No consultations configured. Add an agent to start.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={consultRules.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {consultRules.map((consult) => (
                    <SortableConsultItem
                      key={consult.id}
                      consult={consult}
                      onEdit={() => handleEditConsult(consult)}
                      onRemove={() => handleRemoveConsult(consult.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
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

      {/* Add/Edit Consult Modal */}
      {showAddConsult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {editingConsultId ? 'Edit Agent Consultation' : 'Add Agent Consultation'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Select an agent that this agent can consult during execution.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agent to Consult
                </label>
                <select
                  value={selectedConsultAgent}
                  onChange={(e) => setSelectedConsultAgent(e.target.value)}
                  disabled={!!editingConsultId}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Choose an agent...</option>
                  {editingConsultId
                    ? allAgents.filter((a) => a.id === selectedConsultAgent).map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))
                    : availableAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purpose / Why Consult This Agent
                </label>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Flow Mode:
                    </div>
                    <textarea
                      rows={2}
                      value={flowModePurpose}
                      onChange={(e) => setFlowModePurpose(e.target.value)}
                      placeholder="e.g., Please research and provide fact-checking for creative writing assistance."
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Q&A Mode:
                    </div>
                    <textarea
                      rows={2}
                      value={qaModePurpose}
                      onChange={(e) => setQaModePurpose(e.target.value)}
                      placeholder="e.g., Please analyze the user input and provide an answer about the input in your area of expertise."
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddConsult(false);
                  setEditingConsultId(null);
                  setSelectedConsultAgent('');
                  setFlowModePurpose('');
                  setQaModePurpose('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddConsult}
                disabled={
                  (addConsultMutation.isPending || updateConsultMutation.isPending) ||
                  !selectedConsultAgent ||
                  !flowModePurpose.trim() ||
                  !qaModePurpose.trim()
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(addConsultMutation.isPending || updateConsultMutation.isPending) ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingConsultId ? 'Updating...' : 'Adding...'}
                  </span>
                ) : (
                  editingConsultId ? 'Update Consultation' : 'Add Consultation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Agent
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;{agent.name}&quot;? This action cannot be undone.
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
