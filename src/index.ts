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
async function coolifyApiCall(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
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

const ApplicationUpdateSchema = z.object({
  health_check_enabled: z.boolean().optional(),
  health_check_path: z.string().optional(),
  health_check_port: z.string().nullable().optional(),
  health_check_host: z.string().nullable().optional(),
  health_check_method: z.string().optional(),
  health_check_return_code: z.number().optional(),
  health_check_scheme: z.string().optional(),
  health_check_response_text: z.string().nullable().optional(),
  health_check_interval: z.number().optional(),
  health_check_timeout: z.number().optional(),
  health_check_retries: z.number().optional(),
  health_check_start_period: z.number().optional(),
  // Add other updateable fields
  name: z.string().optional(),
  description: z.string().optional(),
  domains: z.string().optional(),
});

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list-resources",
        description: "Retrieve a comprehensive list of all resources managed by Coolify. This includes applications, services, databases, and deployments.",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "list-applications",
        description: "Fetch a list of all applications currently managed by Coolify. This provides an overview of all deployed applications.",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "get-application",
        description: "Retrieve detailed information about a specific application using its UUID. This includes the application's status, configuration, and deployment details.",
        inputSchema: zodToJsonSchema(UuidSchema),
      },
      {
        name: "start-application",
        description: "Start a specific application using its UUID. This initiates the application and makes it available for use.",
        inputSchema: zodToJsonSchema(UuidSchema),
      },
      {
        name: "stop-application",
        description: "Stop a specific application using its UUID. This halts the application and makes it unavailable.",
        inputSchema: zodToJsonSchema(UuidSchema),
      },
      {
        name: "restart-application",
        description: "Restart a specific application using its UUID. This stops and then starts the application, applying any configuration changes.",
        inputSchema: zodToJsonSchema(UuidSchema),
      },
      {
        name: "list-services",
        description: "Retrieve a list of all services managed by Coolify. This includes external services and microservices.",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "list-databases",
        description: "Fetch a list of all databases managed by Coolify. This provides an overview of all database instances.",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "list-deployments",
        description: "Retrieve a list of all running deployments in Coolify. This includes details about the deployment status and history.",
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: "deploy",
        description: "Deploy an application or service using a tag or UUID. This allows you to deploy new versions or updates to your applications.",
        inputSchema: zodToJsonSchema(DeploySchema),
      },
      {
        name: "update-application",
        description: "Update the settings of a specific application, such as health check configurations. This allows you to modify the application's behavior and monitoring settings.",
        inputSchema: zodToJsonSchema(z.object({
          uuid: z.string().describe("Resource UUID"),
          settings: ApplicationUpdateSchema
        })),
      },
      {
        name: "get-logs",
        description: "Retrieve logs from either an application or a deployment using its UUID. Set the type parameter to specify which logs to retrieve ('application' or 'deployment').",
        inputSchema: zodToJsonSchema(z.object({
          uuid: z.string().describe("Resource UUID"),
          type: z.enum(['application', 'deployment']).describe("Type of resource to get logs for"),
          lines: z.number().optional().describe("Number of lines to show (only applicable for application logs, default: 100)")
        })),
      },
      // Additional tools can be added here
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

      case "update-application": {
        const { uuid, settings } = request.params.arguments as { uuid: string; settings: any };
        const result = await coolifyApiCall(`/applications/${uuid}`, 'PATCH', settings);
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

      case "get-logs": {
        const { uuid, type, lines = 100 } = request.params.arguments as { 
          uuid: string; 
          type: 'application' | 'deployment';
          lines?: number 
        };
        
        let result;
        if (type === 'application') {
          result = await coolifyApiCall(`/applications/${uuid}/logs?lines=${lines}`);
        } else if (type === 'deployment') {
          result = await coolifyApiCall(`/deployments/${uuid}`);
        } else {
          throw new Error(`Invalid log type: ${type}`);
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
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
