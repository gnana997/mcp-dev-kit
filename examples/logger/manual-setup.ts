/**
 * Manual setup example - Custom logger instance
 *
 * Create a logger with custom configuration.
 */

import { createLogger } from 'mcp-dev-kit';

// Create a custom logger with specific options
const logger = createLogger({
  timestamps: true,
  colors: true,
  level: 'info', // Only show info and above (no debug)
});

// Use the logger
logger.info('Server starting...');
logger.warn('Configuration may need updating');
logger.error('Connection failed', { reason: 'timeout' });

// Debug won't be shown (level is 'info')
logger.debug('This will not be printed');

// Simulate some work
async function main() {
  logger.info('Loading configuration...');

  await new Promise((resolve) => setTimeout(resolve, 500));

  logger.info('Configuration loaded successfully');

  // Cleanup when done
  await logger.close();
}

main();
