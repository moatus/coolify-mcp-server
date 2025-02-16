#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const server = new Server(
  {
    name: "coolify",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function for API calls
async function coolifyApiCall(endpoint: string, method = 'GET', body?: any) {
  const baseUrl = process.env.COOLIFY_BASE_URL?.replace(/\/$/, '') || 'https://coolify.stuartmason.co.uk';
  const url = `${baseUrl}/api/v1${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.COOLIFY_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(JSON.stringify({
      error: `Coolify API error: ${response.status} ${response.statusText}`,
      status: response.status,
      details: errorBody
    }));
  }

  return await response.json();
}

// Schema Definitions
const UuidSchema = z.object({
  uuid: z.string().describe("Resource UUID"),
});

const DeploySchema = z.object({
  tag: z.string().optional().describe("Tag name(s). Comma separated list is accepted"),
  uuid: z.string().optional().describe("Resource UUID(s). Comma separated list is accepted"),
  force: z.boolean().optional().describe("Force rebuild (without cache)"),
});

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list-resources",
        description: "List all resources in Coolify",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "list-applications",
        description: "List all applications",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "get-application",
        description: "Get details of a specific application",
        inputSchema: zodToJsonSchema(UuidSchema),
      },
      {
        name: "start-application",
        description: "Start a specific application",
        inputSchema: zodToJsonSchema(UuidSchema),
      },
      {
        name: "stop-application",
        description: "Stop a specific application",
        inputSchema: zodToJsonSchema(UuidSchema),
      },
      {
        name: "restart-application",
        description: "Restart a specific application",
        inputSchema: zodToJsonSchema(UuidSchema),
      },
      {
        name: "list-services",
        description: "List all services",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "list-databases",
        description: "List all databases",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "list-deployments",
        description: "List all running deployments",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "deploy",
        description: "Deploy by tag or uuid",
        inputSchema: zodToJsonSchema(DeploySchema),
      },
      {
        name: "get-version",
        description: "Get Coolify version",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "health-check",
        description: "Get system health status",
        inputSchema: zodToJsonSchema(z.object({})),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "list-resources": {
        const resources = await coolifyApiCall('/resources');
        return {
          content: [{
            type: "text",
            text: JSON.stringify(resources, null, 2)
          }]
        };
      }

      case "list-applications": {
        const apps = await coolifyApiCall('/applications');
        return {
          content: [{
            type: "text",
            text: JSON.stringify(apps, null, 2)
          }]
        };
      }

      case "get-application": {
        const { uuid } = UuidSchema.parse(request.params.arguments);
        const app = await coolifyApiCall(`/applications/${uuid}`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(app, null, 2)
          }]
        };
      }

      case "start-application": {
        const { uuid } = UuidSchema.parse(request.params.arguments);
        const result = await coolifyApiCall(`/applications/${uuid}/start`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "stop-application": {
        const { uuid } = UuidSchema.parse(request.params.arguments);
        const result = await coolifyApiCall(`/applications/${uuid}/stop`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "restart-application": {
        const { uuid } = UuidSchema.parse(request.params.arguments);
        const result = await coolifyApiCall(`/applications/${uuid}/restart`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "list-services": {
        const services = await coolifyApiCall('/services');
        return {
          content: [{
            type: "text",
            text: JSON.stringify(services, null, 2)
          }]
        };
      }

      case "list-databases": {
        const databases = await coolifyApiCall('/databases');
        return {
          content: [{
            type: "text",
            text: JSON.stringify(databases, null, 2)
          }]
        };
      }

      case "list-deployments": {
        const deployments = await coolifyApiCall('/deployments');
        return {
          content: [{
            type: "text",
            text: JSON.stringify(deployments, null, 2)
          }]
        };
      }

      case "deploy": {
        const params = DeploySchema.parse(request.params.arguments);
        const queryParams = new URLSearchParams();
        if (params.tag) queryParams.append('tag', params.tag);
        if (params.uuid) queryParams.append('uuid', params.uuid);
        if (params.force) queryParams.append('force', 'true');
        
        const result = await coolifyApiCall(`/deploy?${queryParams.toString()}`);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "get-version": {
        const version = await coolifyApiCall('/version');
        return {
          content: [{
            type: "text",
            text: JSON.stringify(version, null, 2)
          }]
        };
      }

      case "health-check": {
        const health = await coolifyApiCall('/health');
        return {
          content: [{
            type: "text",
            text: JSON.stringify(health, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    throw error;
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Coolify MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

