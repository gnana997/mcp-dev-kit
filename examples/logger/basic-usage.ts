/**
 * Basic usage example - Auto-patch console
 *
 * This is the simplest way to use mcp-dev-kit.
 * Just import the logger and console.log works!
 */

// Auto-patches console methods to use stderr
import 'mcp-dev-kit/logger';

// Now you can use console.log without breaking MCP stdio!
console.log('Server starting...');
console.info('Configuration loaded');
console.warn('This is a warning');
console.error('This is an error');

// Objects are automatically formatted
const config = {
  port: 3000,
  host: 'localhost',
  features: ['tools', 'resources', 'prompts'],
};

console.log('Server config:', config);

// Simulate some work
setTimeout(() => {
  console.log('Server ready!');
}, 1000);
