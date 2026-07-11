import { observability } from './Observability';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
}

export class ToolExecutionEngine {
  private registeredTools: Map<string, ToolDefinition> = new Map();

  public registerTool(tool: ToolDefinition) {
    this.registeredTools.set(tool.name, tool);
  }

  public async executeTool(sessionId: string, toolName: string, args: any): Promise<any> {
    const tool = this.registeredTools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    observability.startSpan(`tool-${sessionId}`);
    observability.logEvent(sessionId, 'TOOL_EXECUTION_STARTED', { tool: toolName, args });

    try {
      const result = await tool.execute(args);
      observability.endSpan(`tool-${sessionId}`, sessionId, 'TOOL_EXECUTION_COMPLETED', { tool: toolName, result });
      return result;
    } catch (error: any) {
      observability.endSpan(`tool-${sessionId}`, sessionId, 'TOOL_EXECUTION_FAILED', { tool: toolName, error: error.message });
      throw error;
    }
  }

  public getAvailableTools(): any[] {
    return Array.from(this.registeredTools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }
}

export const toolEngine = new ToolExecutionEngine();
