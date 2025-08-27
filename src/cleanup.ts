import * as core from '@actions/core';
import { CleanupResult, ActionInputs } from './types/interfaces';
import { Logger } from './utils/logger';
import { BackupManager } from './utils/backup';
import { ValidationManager } from './utils/validation';
import { GitManager } from './managers/gitManager';
import { HookManager } from './managers/hookManager';
import { ConfigManager } from './managers/configManager';
import { CONSTANTS, ERROR_MESSAGES } from './utils/constants';

export async function cleanupEnvironment(
  inputs: ActionInputs,
  logger: Logger
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: false,
    restored: false,
    errors: [],
    warnings: [],
  };

  logger.startGroup('🧹 Cleaning up Copilot Environment');

  try {
    // Initialize managers
    const backupManager = new BackupManager(logger, inputs.workingDirectory);
    const validationManager = new ValidationManager(
      logger,
      inputs.workingDirectory
    );
    const gitManager = new GitManager(logger, inputs.workingDirectory);
    const hookManager = new HookManager(logger, inputs.workingDirectory);
    const configManager = new ConfigManager(logger, inputs.workingDirectory);

    // Step 1: Load backup information
    logger.info('Step 1: Loading backup information');
    let backupInfo;

    try {
      const backupLocation = core.getState(
        CONSTANTS.STATE_KEYS.BACKUP_LOCATION
      );
      const originalConfigs = core.getState(
        CONSTANTS.STATE_KEYS.ORIGINAL_CONFIGS
      );

      if (backupLocation && originalConfigs) {
        try {
          backupInfo = JSON.parse(originalConfigs);
          logger.debug('Backup information loaded from state');
        } catch {
          // If parsing fails, try loading from backup location
          if (backupLocation) {
            backupInfo = await backupManager.loadBackupManifest(backupLocation);
            logger.debug('Backup information loaded from manifest');
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load backup information', error);
      result.warnings.push(
        'Backup information not found - performing partial cleanup'
      );
    }

    // Step 2: Restore git configuration
    logger.info('Step 2: Restoring git configuration');
    try {
      if (backupInfo?.gitConfig) {
        await gitManager.restoreGitConfig(backupInfo.gitConfig);
        logger.debug('Git configuration restored from backup');
      } else {
        // Fallback: just re-enable hooks
        await gitManager.enableHooks();
        logger.debug('Git hooks re-enabled (no backup available)');
      }
    } catch (error) {
      const errorMessage = `Failed to restore git configuration: ${error}`;
      logger.error(errorMessage);
      result.errors.push(errorMessage);
    }

    // Step 3: Restore hooks
    logger.info('Step 3: Restoring git hooks');
    try {
      await hookManager.restoreHooks();

      // Verify hooks are working
      const hooksStatus = await hookManager.getHookStatus();
      const workingHooks = Object.values(hooksStatus).filter(Boolean).length;
      logger.debug(`Hook restoration status: ${workingHooks} hooks working`);
    } catch (error) {
      const errorMessage = `Failed to restore hooks: ${error}`;
      logger.error(errorMessage);
      result.errors.push(errorMessage);
    }

    // Step 4: Re-enable linting tools
    logger.info('Step 4: Re-enabling linting tools');
    try {
      await configManager.enableLintingTools();
    } catch (error) {
      const errorMessage = `Failed to re-enable linting tools: ${error}`;
      logger.warn(errorMessage);
      result.warnings.push(errorMessage);
    }

    // Step 5: Restore configurations
    if (backupInfo && inputs.backupConfigs) {
      logger.info('Step 5: Restoring configuration files');
      try {
        await backupManager.restoreBackup(backupInfo);
        result.restored = true;
        logger.debug('Configuration files restored successfully');
      } catch (error) {
        const errorMessage = ERROR_MESSAGES.BACKUP_RESTORATION_FAILED;
        logger.error(errorMessage, error);
        result.errors.push(errorMessage);
      }
    } else {
      logger.info('Step 5: No backup to restore (or backup disabled)');
    }

    // Step 6: Clean up temporary files
    logger.info('Step 6: Cleaning up temporary files');
    try {
      await backupManager.cleanupOldBackups();

      // Clear action state
      core.saveState(CONSTANTS.STATE_KEYS.BACKUP_LOCATION, '');
      core.saveState(CONSTANTS.STATE_KEYS.ORIGINAL_CONFIGS, '');
      core.saveState(CONSTANTS.STATE_KEYS.CLEANUP_REQUIRED, '');
    } catch (error) {
      logger.warn('Failed to clean up temporary files', error);
      result.warnings.push('Failed to clean up temporary files');
    }

    // Step 7: Final validation
    logger.info('Step 7: Performing final validation');
    try {
      const validation = await validationManager.validateEnvironment();
      result.warnings.push(...validation.warnings);

      // Check if hooks are working properly
      const hooksDisabled = await validationManager.validateHooksDisabled();
      if (hooksDisabled) {
        result.warnings.push('Git hooks appear to still be disabled');
      }

      // Verify git access
      const gitAccess = await gitManager.verifyAccess();
      if (!gitAccess) {
        result.warnings.push('Git access verification failed after cleanup');
      }
    } catch (error) {
      logger.warn('Final validation failed', error);
      result.warnings.push('Final validation failed');
    }

    // Step 8: Generate cleanup report
    logger.info('Step 8: Generating cleanup report');
    const report = generateCleanupReport(result, backupInfo);
    logger.info('Cleanup Report:', report);

    result.success = true;
    logger.info('✅ Copilot environment cleanup completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Cleanup failed', error);
    result.errors.push(errorMessage);
    result.success = false;
  } finally {
    logger.endGroup();
  }

  return result;
}

export async function performEmergencyCleanup(
  workingDirectory: string,
  logger: Logger
): Promise<void> {
  logger.startGroup('🚨 Performing Emergency Cleanup');

  try {
    logger.warn(
      'Starting emergency cleanup - this will attempt to restore environment without backup'
    );

    const gitManager = new GitManager(logger, workingDirectory);
    const hookManager = new HookManager(logger, workingDirectory);
    const configManager = new ConfigManager(logger, workingDirectory);
    const backupManager = new BackupManager(logger, workingDirectory);

    // Re-enable git hooks
    try {
      await gitManager.enableHooks();
      logger.info('Git hooks re-enabled');
    } catch (error) {
      logger.error('Failed to re-enable git hooks', error);
    }

    // Attempt to restore hooks from backup
    try {
      await hookManager.restoreHooks();
      logger.info('Hooks restored from backup');
    } catch (error) {
      logger.warn('Failed to restore hooks from backup', error);
    }

    // Re-enable linting tools
    try {
      await configManager.enableLintingTools();
      logger.info('Linting tools re-enabled');
    } catch (error) {
      logger.warn('Failed to re-enable linting tools', error);
    }

    // Clean up old backups
    try {
      await backupManager.cleanupOldBackups();
      logger.info('Old backups cleaned up');
    } catch (error) {
      logger.warn('Failed to clean up old backups', error);
    }

    logger.info('Emergency cleanup completed');
  } catch (error) {
    logger.error('Emergency cleanup failed', error);
    throw error;
  } finally {
    logger.endGroup();
  }
}

function generateCleanupReport(
  result: CleanupResult,
  backupInfo?: any
): Record<string, any> {
  return {
    success: result.success,
    restored: result.restored,
    backupUsed: !!backupInfo,
    errorsCount: result.errors.length,
    warningsCount: result.warnings.length,
    errors: result.errors,
    warnings: result.warnings,
    timestamp: new Date().toISOString(),
  };
}
