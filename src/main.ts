import * as core from '@actions/core';
import { ActionInputs } from './types/interfaces';
import { OperationType } from './types/enums';
import { Logger } from './utils/logger';
import { setupEnvironment } from './setup';
import { cleanupEnvironment, performEmergencyCleanup } from './cleanup';
import { CONSTANTS, ERROR_MESSAGES } from './utils/constants';

async function run(): Promise<void> {
  const logger = new Logger(core.getBooleanInput('debug'));

  try {
    logger.info('🤖 Starting Copilot Environment Action');

    // Parse inputs
    const inputs = parseInputs();
    logger.debug('Action inputs', inputs);

    // Validate operation
    if (
      !Object.values(OperationType).includes(inputs.operation as OperationType)
    ) {
      throw new Error(
        `${ERROR_MESSAGES.UNKNOWN_OPERATION}: ${inputs.operation}`
      );
    }

    // Execute operation
    switch (inputs.operation) {
      case OperationType.SETUP:
        await executeSetup(inputs, logger);
        break;

      case OperationType.CLEANUP:
        await executeCleanup(inputs, logger);
        break;

      case OperationType.AUTO:
        await executeAuto(inputs, logger);
        break;

      default:
        throw new Error(
          `${ERROR_MESSAGES.UNKNOWN_OPERATION}: ${inputs.operation}`
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Action failed', error);
    core.setFailed(`Copilot Environment Action failed: ${message}`);
  }
}

async function cleanup(): Promise<void> {
  const logger = new Logger(false); // Disable debug for cleanup

  try {
    const cleanupRequired = core.getState(
      CONSTANTS.STATE_KEYS.CLEANUP_REQUIRED
    );

    if (cleanupRequired === 'true') {
      logger.info('🧹 Starting post-action cleanup');

      const inputs = parseInputs();
      const result = await cleanupEnvironment(inputs, logger);

      if (!result.success) {
        logger.warn('Standard cleanup failed, attempting emergency cleanup');
        await performEmergencyCleanup(inputs.workingDirectory, logger);
      }

      logger.info('Post-action cleanup completed');
    } else {
      logger.debug('No cleanup required');
    }
  } catch (error) {
    logger.error('Post-action cleanup failed', error);
    core.warning(`Cleanup failed: ${error}`);
  }
}

async function executeSetup(
  inputs: ActionInputs,
  logger: Logger
): Promise<void> {
  logger.startGroup('Setup Operation');

  try {
    const result = await setupEnvironment(inputs, logger);

    // Set outputs
    core.setOutput('setup-successful', result.success.toString());
    core.setOutput('environment-ready', result.environmentReady.toString());
    core.setOutput('backup-location', result.backupInfo?.location || '');
    core.setOutput(
      'original-configs',
      result.backupInfo ? JSON.stringify(result.backupInfo) : ''
    );
    core.setOutput('hooks-disabled', inputs.disableHooks.toString());

    if (!result.success) {
      throw new Error(`Setup failed: ${result.errors.join(', ')}`);
    }

    // Log warnings
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        logger.warn(warning);
      }
    }
  } finally {
    logger.endGroup();
  }
}

async function executeCleanup(
  inputs: ActionInputs,
  logger: Logger
): Promise<void> {
  logger.startGroup('Cleanup Operation');

  try {
    const result = await cleanupEnvironment(inputs, logger);

    // Set outputs
    core.setOutput('setup-successful', result.success.toString());
    core.setOutput('environment-ready', 'false');
    core.setOutput('backup-location', '');
    core.setOutput('original-configs', '');
    core.setOutput('hooks-disabled', 'false');

    if (!result.success) {
      throw new Error(`Cleanup failed: ${result.errors.join(', ')}`);
    }

    // Log warnings
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        logger.warn(warning);
      }
    }
  } finally {
    logger.endGroup();
  }
}

async function executeAuto(
  inputs: ActionInputs,
  logger: Logger
): Promise<void> {
  logger.startGroup('Auto Operation (Setup with Post-Cleanup)');

  try {
    // Execute setup
    const result = await setupEnvironment(inputs, logger);

    // Set outputs
    core.setOutput('setup-successful', result.success.toString());
    core.setOutput('environment-ready', result.environmentReady.toString());
    core.setOutput('backup-location', result.backupInfo?.location || '');
    core.setOutput(
      'original-configs',
      result.backupInfo ? JSON.stringify(result.backupInfo) : ''
    );
    core.setOutput('hooks-disabled', inputs.disableHooks.toString());

    if (!result.success) {
      throw new Error(`Auto setup failed: ${result.errors.join(', ')}`);
    }

    // Save state for post-action cleanup
    core.saveState(CONSTANTS.STATE_KEYS.CLEANUP_REQUIRED, 'true');

    // Log warnings
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        logger.warn(warning);
      }
    }
  } finally {
    logger.endGroup();
  }
}

function parseInputs(): ActionInputs {
  return {
    operation: (core.getInput('operation') || 'auto') as OperationType,
    flutterVersion: core.getInput('flutter-version') || '3.35.1',
    nodeVersion: core.getInput('node-version') || 'latest',
    disableHooks: core.getBooleanInput('disable-hooks'),
    backupConfigs: core.getBooleanInput('backup-configs'),
    debug: core.getBooleanInput('debug'),
    workingDirectory: core.getInput('working-directory') || '.',
  };
}

// Main execution logic
if (process.env[CONSTANTS.STATE_POST_ENV]) {
  // This is the post-action cleanup
  cleanup();
} else {
  // This is the main action
  run();
}

// Export functions for testing
export { run, cleanup, parseInputs };
