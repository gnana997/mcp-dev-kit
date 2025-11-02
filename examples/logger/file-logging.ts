/**
 * File logging example
 *
 * Log to both console (stderr) and a file.
 */

import { createLogger } from '../../src/index.js';

// Create logger with file output
const logger = createLogger({
  timestamps: true,
  colors: true,
  logFile: './server.log', // Also write to file
});

logger.info('Server starting...');
logger.info('Logs will be written to both stderr and server.log');

// Simulate some operations
async function performOperations() {
  for (let i = 1; i <= 5; i++) {
    logger.info(`Operation ${i} completed`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.info('All operations completed!');

  // Make sure to close the logger to flush pending writes
  await logger.close();
}

performOperations();
