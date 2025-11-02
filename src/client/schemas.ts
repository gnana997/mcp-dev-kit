/**
 * Zod schemas for MCP protocol validation
 * Provides runtime type checking and helpful error messages
 */

import { z } from 'zod';

/**
 * Tool input schema definition
 */
export const ToolInputSchemaSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
  description: z.string().optional(),
});

/**
 * Tool definition schema
 */
export const ToolSchema = z.object({
  name: z.string().min(1, 'Tool name cannot be empty'),
  description: z.string().optional(),
  inputSchema: ToolInputSchemaSchema,
});

/**
 * Tool content item schema
 */
export const ToolContentSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
  data: z.string().optional(),
  mimeType: z.string().optional(),
});

/**
 * Tool call result schema
 */
export const ToolCallResultSchema = z.object({
  content: z.array(ToolContentSchema),
  isError: z.boolean().optional(),
  _meta: z.record(z.any()).optional(),
});

/**
 * Resource definition schema
 */
export const ResourceSchema = z.object({
  uri: z.string().url('Resource URI must be a valid URL'),
  name: z.string().min(1, 'Resource name cannot be empty'),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  annotations: z.record(z.any()).optional(),
});

/**
 * Resource content schema
 */
export const ResourceContentSchema = z.object({
  contents: z.array(
    z.object({
      uri: z.string().url(),
      mimeType: z.string().optional(),
      text: z.string().optional(),
      blob: z.string().optional(),
    })
  ),
});

/**
 * Prompt argument schema
 */
export const PromptArgumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

/**
 * Prompt definition schema
 */
export const PromptSchema = z.object({
  name: z.string().min(1, 'Prompt name cannot be empty'),
  description: z.string().optional(),
  arguments: z.array(PromptArgumentSchema).optional(),
});

/**
 * Prompt message schema
 */
export const PromptMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.object({
    type: z.string(),
    text: z.string().optional(),
  }),
});

/**
 * Prompt result schema
 */
export const PromptResultSchema = z.object({
  description: z.string().optional(),
  messages: z.array(PromptMessageSchema),
});

/**
 * Server info schema
 */
export const ServerInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
});

/**
 * Client capabilities schema
 */
export const ClientCapabilitiesSchema = z.object({
  roots: z.object({ listChanged: z.boolean().optional() }).optional(),
  sampling: z.object({}).optional(),
  experimental: z.record(z.any()).optional(),
});

/**
 * Server capabilities schema
 */
export const ServerCapabilitiesSchema = z.object({
  logging: z.object({}).optional(),
  prompts: z.object({ listChanged: z.boolean().optional() }).optional(),
  resources: z
    .object({
      subscribe: z.boolean().optional(),
      listChanged: z.boolean().optional(),
    })
    .optional(),
  tools: z.object({ listChanged: z.boolean().optional() }).optional(),
  experimental: z.record(z.any()).optional(),
});

/**
 * Tools list response schema
 */
export const ToolsListResponseSchema = z.object({
  tools: z.array(ToolSchema),
  nextCursor: z.string().optional(),
});

/**
 * Resources list response schema
 */
export const ResourcesListResponseSchema = z.object({
  resources: z.array(ResourceSchema),
  nextCursor: z.string().optional(),
});

/**
 * Prompts list response schema
 */
export const PromptsListResponseSchema = z.object({
  prompts: z.array(PromptSchema),
  nextCursor: z.string().optional(),
});

/**
 * Helper to validate and parse data with helpful error messages
 */
export function validateWith<T>(schema: z.ZodType<T>, data: unknown, context?: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => {
        const path = err.path.join('.');
        return `${path ? `${path}: ` : ''}${err.message}`;
      });

      const contextMsg = context ? ` in ${context}` : '';
      throw new Error(`Validation failed${contextMsg}:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Helper to safely validate without throwing
 */
export function safeValidate<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Type inference helpers
 */
export type Tool = z.infer<typeof ToolSchema>;
export type ToolCallResult = z.infer<typeof ToolCallResultSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type ResourceContent = z.infer<typeof ResourceContentSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type PromptResult = z.infer<typeof PromptResultSchema>;
export type ServerCapabilities = z.infer<typeof ServerCapabilitiesSchema>;
export type ClientCapabilities = z.infer<typeof ClientCapabilitiesSchema>;
