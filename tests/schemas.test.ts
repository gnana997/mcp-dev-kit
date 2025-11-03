/**
 * Tests for schema validation
 */

import { describe, expect, it } from 'vitest';
import {
  ToolCallResultSchema,
  ToolsListResponseSchema,
  validateWith,
} from '../src/client/schemas.js';

describe('Schema Validation', () => {
  describe('validateWith', () => {
    it('should validate correct tool list response', () => {
      const validData = {
        tools: [
          {
            name: 'echo',
            description: 'Test tool',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };

      const result = validateWith(ToolsListResponseSchema, validData, 'test');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0]?.name).toBe('echo');
    });

    it('should throw error on invalid tool list (missing required field)', () => {
      const invalidData = {
        tools: [
          {
            // Missing 'name' field
            description: 'Test tool',
            inputSchema: { type: 'object' },
          },
        ],
      };

      expect(() => {
        validateWith(ToolsListResponseSchema, invalidData, 'tool list');
      }).toThrow('Validation failed in tool list');
    });

    it('should throw error on wrong data type', () => {
      const invalidData = {
        tools: 'not an array', // Should be array
      };

      expect(() => {
        validateWith(ToolsListResponseSchema, invalidData, 'tool list');
      }).toThrow();
    });

    it('should validate tool call result', () => {
      const validData = {
        content: [
          {
            type: 'text',
            text: 'Hello',
          },
        ],
      };

      const result = validateWith(ToolCallResultSchema, validData, 'tool result');
      expect(result.content).toHaveLength(1);
    });

    it('should handle validation error without context', () => {
      const invalidData = { tools: 'invalid' };

      expect(() => {
        validateWith(ToolsListResponseSchema, invalidData);
      }).toThrow('Validation failed');
    });

    it('should include field path in error message', () => {
      const invalidData = {
        tools: [
          {
            name: 'test',
            description: 123, // Should be string
            inputSchema: { type: 'object' },
          },
        ],
      };

      try {
        validateWith(ToolsListResponseSchema, invalidData, 'tools');
        expect.fail('Should have thrown');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toContain('Validation failed in tools');
      }
    });

    it('should handle nested validation errors', () => {
      const invalidData = {
        tools: [
          {
            name: 'test',
            description: 'Test',
            inputSchema: {
              type: 'invalid-type', // Invalid type
            },
          },
        ],
      };

      expect(() => {
        validateWith(ToolsListResponseSchema, invalidData);
      }).toThrow();
    });

    it('should validate tool call with isError flag', () => {
      const errorData = {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Error occurred',
          },
        ],
      };

      const result = validateWith(ToolCallResultSchema, errorData, 'error result');
      expect(result.isError).toBe(true);
    });
  });
});
