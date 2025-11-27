'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { providerConnectionsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, TestTube } from 'lucide-react';

type ConnectionType = 
  | 'apiKey'
  | 'basicAuth'
  | 'oauth2'
  | 'ftp'
  | 'smtp'
  | 'mysql'
  | 'postgresql'
  | 'custom';

interface ConnectionTypeConfig {
  label: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'number';
    required: boolean;
    placeholder?: string;
  }>;
}

const connectionTypes: Record<ConnectionType, ConnectionTypeConfig> = {
  apiKey: {
    label: 'API Key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'Enter your API key' },
      { key: 'endpoint', label: 'Endpoint URL', type: 'url', required: false, placeholder: 'https://api.example.com/v1' },
    ],
  },
  basicAuth: {
    label: 'Basic Authentication',
    fields: [
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'Enter username' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Enter password' },
      { key: 'endpoint', label: 'Endpoint URL', type: 'url', required: false, placeholder: 'https://api.example.com' },
    ],
  },
  oauth2: {
    label: 'OAuth2 API',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'Enter OAuth2 Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: 'Enter OAuth2 Client Secret' },
      { key: 'authUrl', label: 'Authorization URL', type: 'url', required: true, placeholder: 'https://oauth.example.com/authorize' },
      { key: 'tokenUrl', label: 'Token URL', type: 'url', required: true, placeholder: 'https://oauth.example.com/token' },
      { key: 'scope', label: 'Scope (optional)', type: 'text', required: false, placeholder: 'read write' },
    ],
  },
  ftp: {
    label: 'FTP',
    fields: [
      { key: 'host', label: 'Host', type: 'text', required: true, placeholder: 'ftp.example.com' },
      { key: 'port', label: 'Port', type: 'number', required: false, placeholder: '21' },
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'Enter FTP username' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Enter FTP password' },
    ],
  },
  smtp: {
    label: 'SMTP',
    fields: [
      { key: 'host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.example.com' },
      { key: 'port', label: 'Port', type: 'number', required: false, placeholder: '587' },
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'Enter SMTP username' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Enter SMTP password' },
      { key: 'secure', label: 'Use TLS/SSL', type: 'text', required: false, placeholder: 'true/false' },
    ],
  },
  mysql: {
    label: 'MySQL',
    fields: [
      { key: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: false, placeholder: '3306' },
      { key: 'database', label: 'Database', type: 'text', required: true, placeholder: 'database_name' },
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'Enter MySQL username' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Enter MySQL password' },
    ],
  },
  postgresql: {
    label: 'PostgreSQL',
    fields: [
      { key: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost' },
      { key: 'port', label: 'Port', type: 'number', required: false, placeholder: '5432' },
      { key: 'database', label: 'Database', type: 'text', required: true, placeholder: 'database_name' },
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'Enter PostgreSQL username' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Enter PostgreSQL password' },
    ],
  },
  custom: {
    label: 'Custom',
    fields: [
      { key: 'endpoint', label: 'Endpoint URL', type: 'url', required: true, placeholder: 'https://api.example.com' },
      { key: 'method', label: 'HTTP Method', type: 'text', required: false, placeholder: 'GET, POST, PUT, DELETE, etc.' },
      { key: 'headers', label: 'Headers (JSON)', type: 'text', required: false, placeholder: '{"Authorization": "Bearer token", "Content-Type": "application/json"}' },
      { key: 'body', label: 'Body/Parameters (JSON)', type: 'text', required: false, placeholder: '{"key": "value"}' },
    ],
  },
};

export default function NewConnectionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connectionType, setConnectionType] = useState<ConnectionType>('apiKey');
  const [formData, setFormData] = useState({
    name: '',
    credentials: {} as Record<string, string>,
  });
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const typeConfig = connectionTypes[connectionType];

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: (data: { type: string; credentials: Record<string, any> }) => {
      // For API key type, use the apiKey field for backward compatibility
      const testData: any = {
        type: data.type,
        credentials: data.credentials,
      };
      
      // If it's apiKey type, also send apiKey for testing
      if (data.type === 'apiKey' && data.credentials.apiKey) {
        testData.apiKey = data.credentials.apiKey;
        testData.endpoint = data.credentials.endpoint;
      }
      
      return providerConnectionsApi.test(testData);
    },
    onSuccess: (data) => {
      const result = (data as any)?.data;
      setTestResult(result);
      setIsTesting(false);
      if (result?.success) {
        setTimeout(() => setTestResult(null), 3000);
      }
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: error?.response?.data?.data?.message || error?.message || 'Connection test failed',
      });
      setIsTesting(false);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => providerConnectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-connections'] });
      router.push('/admin/connections');
    },
    onError: (error: any) => {
      console.error('Create error:', error);
      setTestResult({
        success: false,
        message: error?.response?.data?.error?.message || error?.message || 'Failed to create connection',
      });
    },
  });

  const handleTest = () => {
    // Validate required fields
    const requiredFields = typeConfig.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formData.credentials[f.key]?.trim());
    
    if (missingFields.length > 0) {
      setTestResult({
        success: false,
        message: `Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`,
      });
      return;
    }

    // Validate JSON fields for custom type
    if (connectionType === 'custom') {
      if (formData.credentials.headers) {
        try {
          JSON.parse(formData.credentials.headers);
        } catch (e) {
          setTestResult({
            success: false,
            message: 'Headers must be valid JSON format',
          });
          return;
        }
      }
      if (formData.credentials.body) {
        try {
          JSON.parse(formData.credentials.body);
        } catch (e) {
          setTestResult({
            success: false,
            message: 'Body must be valid JSON format',
          });
          return;
        }
      }
    }

    setIsTesting(true);
    setTestResult(null);
    
    // Parse JSON fields before sending
    const testCredentials: Record<string, any> = { ...formData.credentials };
    if (connectionType === 'custom') {
      if (testCredentials.headers) {
        testCredentials.headers = JSON.parse(testCredentials.headers);
      }
      if (testCredentials.body) {
        testCredentials.body = JSON.parse(testCredentials.body);
      }
    }
    
    testMutation.mutate({
      type: connectionType,
      credentials: testCredentials,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = typeConfig.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formData.credentials[f.key]?.trim());
    
    if (missingFields.length > 0) {
      setTestResult({
        success: false,
        message: `Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`,
      });
      return;
    }

    if (!formData.name.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a connection name',
      });
      return;
    }

    // Validate JSON fields for custom type
    if (connectionType === 'custom') {
      if (formData.credentials.headers) {
        try {
          JSON.parse(formData.credentials.headers);
        } catch (e) {
          setTestResult({
            success: false,
            message: 'Headers must be valid JSON format',
          });
          return;
        }
      }
      if (formData.credentials.body) {
        try {
          JSON.parse(formData.credentials.body);
        } catch (e) {
          setTestResult({
            success: false,
            message: 'Body must be valid JSON format',
          });
          return;
        }
      }
    }

    // Prepare credentials - encrypt sensitive fields
    const credentials: Record<string, any> = {};
    typeConfig.fields.forEach(field => {
      const value = formData.credentials[field.key]?.trim();
      if (value) {
        // Parse JSON fields for custom type
        if (connectionType === 'custom' && (field.key === 'headers' || field.key === 'body')) {
          try {
            credentials[field.key] = JSON.parse(value);
          } catch (e) {
            // Should not reach here due to validation above, but just in case
            setTestResult({
              success: false,
              message: `${field.label} must be valid JSON format`,
            });
            return;
          }
        } else {
          credentials[field.key] = value;
        }
      }
    });

    // For API key type, also store in apiKey field for backward compatibility
    const createData: any = {
      name: formData.name,
      type: connectionType,
      metadata: credentials,
    };

    if (connectionType === 'apiKey' && credentials.apiKey) {
      createData.apiKey = credentials.apiKey;
      createData.endpoint = credentials.endpoint;
    }

    createMutation.mutate(createData);
  };

  const updateCredential = (key: string, value: string) => {
    setFormData({
      ...formData,
      credentials: {
        ...formData.credentials,
        [key]: value,
      },
    });
  };

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Add New Connection
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Configure credentials for any service or provider
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-6">
          {/* Connection Name */}
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
              placeholder="e.g., Production API Key"
            />
          </div>

          {/* Connection Type */}
          <div>
            <label
              htmlFor="connectionType"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Connection Type <span className="text-red-500">*</span>
            </label>
            <select
              id="connectionType"
              required
              value={connectionType}
              onChange={(e) => {
                setConnectionType(e.target.value as ConnectionType);
                setFormData({ ...formData, credentials: {} });
                setTestResult(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="apiKey">API Key</option>
              <option value="basicAuth">Basic Authentication</option>
              <option value="oauth2">OAuth2 API</option>
              <option value="ftp">FTP</option>
              <option value="smtp">SMTP</option>
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="custom">Custom</option>
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Select the type of connection you want to configure
            </p>
          </div>

          {/* Dynamic Fields based on Connection Type */}
          {typeConfig.fields.map((field) => {
            const isTextarea = field.key === 'headers' || field.key === 'body';
            const isSelect = field.key === 'method';
            
            return (
              <div key={field.key}>
                <label
                  htmlFor={field.key}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {isTextarea ? (
                  <textarea
                    id={field.key}
                    required={field.required}
                    rows={6}
                    value={formData.credentials[field.key] || ''}
                    onChange={(e) => updateCredential(field.key, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder={field.placeholder}
                  />
                ) : isSelect ? (
                  <select
                    id={field.key}
                    required={field.required}
                    value={formData.credentials[field.key] || ''}
                    onChange={(e) => updateCredential(field.key, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select method...</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                    <option value="OPTIONS">OPTIONS</option>
                  </select>
                ) : (
                  <input
                    type={field.type}
                    id={field.key}
                    required={field.required}
                    value={formData.credentials[field.key] || ''}
                    onChange={(e) => updateCredential(field.key, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder={field.placeholder}
                  />
                )}
                {isTextarea && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Enter valid JSON format. Example: {field.key === 'headers' ? '{"Authorization": "Bearer token"}' : '{"key": "value"}'}
                  </p>
                )}
              </div>
            );
          })}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All credentials will be encrypted and stored securely. They will never be displayed in plain text.
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
            disabled={isTesting}
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
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Connection'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
