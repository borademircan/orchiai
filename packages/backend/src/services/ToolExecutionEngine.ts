import { Tool, ToolType, HttpMethod } from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  executionTimeMs: number;
}

export interface ToolExecutionRequest {
  toolId: string;
  parameters: Record<string, any>;
}

/**
 * Tool Execution Engine
 * Executes tools based on their configuration (HTTP-based tools)
 */
export class ToolExecutionEngine {
  private timeout: number = 30000; // 30 seconds default timeout

  /**
   * Execute a tool with given parameters
   */
  async executeTool(
    tool: Tool,
    parameters: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    logger.info({ toolId: tool.id, toolName: tool.name }, 'Executing tool');

    // Validate tool is active (check if tool has isActive property from database)
    const toolWithActive = tool as Tool & { isActive?: boolean };
    if (toolWithActive.isActive === false) {
      throw new AppError(400, 'Tool is not active', 'TOOL_NOT_ACTIVE');
    }

    // Validate endpoint exists
    if (!tool.endpoint) {
      throw new AppError(400, 'Tool endpoint not configured', 'TOOL_ENDPOINT_MISSING');
    }

    // Validate parameters against schema
    this.validateParameters(parameters, tool.schema as Record<string, any>);

    try {
      // Execute based on HTTP method
      const result = await this.executeHttpRequest(
        tool.endpoint,
        tool.method || HttpMethod.POST,
        parameters,
        tool.connectionId || undefined
      );

      const executionTime = Date.now() - startTime;
      logger.info(
        { toolId: tool.id, executionTime },
        'Tool execution completed'
      );

      return {
        success: true,
        data: result.data,
        statusCode: result.statusCode,
        executionTimeMs: executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(
        { toolId: tool.id, error: error.message, executionTime },
        'Tool execution failed'
      );

      return {
        success: false,
        error: error.message || 'Tool execution failed',
        executionTimeMs: executionTime,
      };
    }
  }

  /**
   * Execute HTTP request to tool endpoint
   */
  private async executeHttpRequest(
    endpoint: string,
    method: HttpMethod,
    parameters: Record<string, any>,
    connectionId?: string
  ): Promise<{ data: any; statusCode: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Prepare request options
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // TODO: Add credential handling if connectionId is provided
      // For now, tools can use API keys in parameters or headers via schema

      let url = endpoint;
      let body: string | undefined;

      // Handle different HTTP methods
      switch (method) {
        case HttpMethod.GET:
          // Append parameters as query string
          const queryParams = new URLSearchParams();
          Object.entries(parameters).forEach(([key, value]) => {
            queryParams.append(key, String(value));
          });
          url = `${endpoint}?${queryParams.toString()}`;
          break;

        case HttpMethod.POST:
        case HttpMethod.PUT:
        case HttpMethod.PATCH:
          body = JSON.stringify(parameters);
          break;

        case HttpMethod.DELETE:
          // DELETE typically doesn't have body, but some APIs support it
          if (Object.keys(parameters).length > 0) {
            body = JSON.stringify(parameters);
          }
          break;

        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: any;

      // Try to parse as JSON, fallback to text
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        throw new Error(
          `Tool execution failed: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`
        );
      }

      return {
        data: responseData,
        statusCode: response.status,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Tool execution timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Validate parameters against tool schema
   */
  private validateParameters(
    parameters: Record<string, any>,
    schema: Record<string, any>
  ): void {
    // Basic schema validation
    // Schema format: { "propertyName": { "type": "string", "required": true }, ... }
    if (!schema || typeof schema !== 'object') {
      // If no schema defined, allow all parameters
      return;
    }

    const schemaProperties = schema.properties || schema;
    const requiredFields = schema.required || [];

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in parameters) || parameters[field] === undefined) {
        throw new AppError(
          400,
          `Missing required parameter: ${field}`,
          'MISSING_REQUIRED_PARAMETER'
        );
      }
    }

    // Validate parameter types (basic validation)
    for (const [key, value] of Object.entries(parameters)) {
      const fieldSchema = schemaProperties[key];
      if (fieldSchema && fieldSchema.type) {
        const expectedType = fieldSchema.type;
        const actualType = typeof value;

        // Type checking
        if (expectedType === 'string' && actualType !== 'string') {
          throw new AppError(
            400,
            `Parameter ${key} must be of type ${expectedType}, got ${actualType}`,
            'INVALID_PARAMETER_TYPE'
          );
        }
        if (expectedType === 'number' && actualType !== 'number') {
          throw new AppError(
            400,
            `Parameter ${key} must be of type ${expectedType}, got ${actualType}`,
            'INVALID_PARAMETER_TYPE'
          );
        }
        if (expectedType === 'boolean' && actualType !== 'boolean') {
          throw new AppError(
            400,
            `Parameter ${key} must be of type ${expectedType}, got ${actualType}`,
            'INVALID_PARAMETER_TYPE'
          );
        }
      }
    }
  }

  /**
   * Test tool connection
   * Makes a minimal request to verify the tool endpoint is accessible
   */
  async testConnection(tool: Tool & { isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    logger.info({ toolId: tool.id }, 'Testing tool connection');

    if (!tool.endpoint) {
      return {
        success: false,
        message: 'Tool endpoint not configured',
      };
    }

    try {
      // Make a simple HEAD or GET request to test connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for test

      const response = await fetch(tool.endpoint, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => {
        // If HEAD fails, try GET
        return fetch(tool.endpoint!, {
          method: 'GET',
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status < 500) {
        return {
          success: true,
          message: 'Tool endpoint is accessible',
        };
      } else {
        return {
          success: false,
          message: `Tool endpoint returned status ${response.status}`,
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection test timeout',
        };
      }
      return {
        success: false,
        message: `Connection test failed: ${error.message || 'Unknown error'}`,
      };
    }
  }
}

export default new ToolExecutionEngine();

