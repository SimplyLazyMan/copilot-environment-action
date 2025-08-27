import * as core from '@actions/core';
import { SetupResult, ActionInputs, BackupInfo } from './types/interfaces';
import { PackageManager as PackageManagerType } from './types/enums';
import { Logger } from './utils/logger';
import { BackupManager } from './utils/backup';
import { ValidationManager } from './utils/validation';
import { GitManager } from './managers/gitManager';
import { HookManager } from './managers/hookManager';
import { ConfigManager } from './managers/configManager';
import { PackageManager } from './managers/packageManager';
import { RuntimeManager } from './managers/runtimeManager';
import { CONSTANTS, ERROR_MESSAGES } from './utils/constants';

export async function setupEnvironment(
  inputs: ActionInputs,
  logger: Logger
): Promise<SetupResult> {
  const result: SetupResult = {
    success: false,
    environmentReady: false,
    errors: [],
    warnings: [],
  };

  logger.startGroup('🚀 Setting up Copilot Environment');

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
    const packageManager = new PackageManager(logger, inputs.workingDirectory);
    const runtimeManager = new RuntimeManager(logger, inputs.workingDirectory);

    // Step 1: Check and setup runtime environments
    logger.info('Step 1: Checking runtime environments');
    const runtimeInfo = await runtimeManager.checkRuntimes();
    logger.debug('Current runtime info', runtimeInfo);

    // Setup Flutter if required and not installed correctly
    if (inputs.flutterVersion && inputs.flutterVersion !== '') {
      const projectType = await runtimeManager.validateProjectType();
      if (projectType === 'flutter' || projectType === 'mixed') {
        if (
          !runtimeInfo.flutter.installed ||
          (runtimeInfo.flutter.version &&
            runtimeManager.normalizeVersion(runtimeInfo.flutter.version) !==
              runtimeManager.normalizeVersion(inputs.flutterVersion))
        ) {
          logger.info(`Setting up Flutter ${inputs.flutterVersion}`);
          const flutterSetup = await runtimeManager.setupFlutter(
            inputs.flutterVersion
          );
          if (!flutterSetup) {
            result.warnings.push(
              `Flutter ${inputs.flutterVersion} setup failed`
            );
          }
        }
      }
    }

    // Setup Node.js if required and not installed correctly
    if (
      inputs.nodeVersion &&
      inputs.nodeVersion !== '' &&
      inputs.nodeVersion !== 'latest'
    ) {
      const projectType = await runtimeManager.validateProjectType();
      if (projectType === 'node' || projectType === 'mixed') {
        if (
          !runtimeInfo.node.installed ||
          (runtimeInfo.node.version &&
            runtimeManager.extractMajorVersion(runtimeInfo.node.version) !==
              runtimeManager.extractMajorVersion(inputs.nodeVersion))
        ) {
          logger.info(`Setting up Node.js ${inputs.nodeVersion}`);
          const nodeSetup = await runtimeManager.setupNode(inputs.nodeVersion);
          if (!nodeSetup) {
            result.warnings.push(`Node.js ${inputs.nodeVersion} setup failed`);
          }
        }
      }
    }

    // Step 2: Validate environment
    logger.info('Step 2: Validating environment');
    const validation = await validationManager.validateEnvironment();
    if (!validation.isValid) {
      result.errors.push(...validation.errors);
      throw new Error('Environment validation failed');
    }
    result.warnings.push(...validation.warnings);

    // Step 2: Detect current environment
    logger.info('Step 2: Detecting environment configuration');
    const environmentInfo = await validationManager.detectEnvironment();
    logger.debug('Environment info', environmentInfo);

    // Step 3: Create backup
    if (inputs.backupConfigs) {
      logger.info('Step 3: Creating configuration backup');
      try {
        result.backupInfo = await backupManager.createBackup();

        // Save backup location to action state for cleanup
        core.saveState(
          CONSTANTS.STATE_KEYS.BACKUP_LOCATION,
          result.backupInfo.location
        );
        core.saveState(
          CONSTANTS.STATE_KEYS.ORIGINAL_CONFIGS,
          JSON.stringify(result.backupInfo)
        );
      } catch (error) {
        result.errors.push(ERROR_MESSAGES.BACKUP_CREATION_FAILED);
        throw error;
      }
    }

    // Step 4: Backup git configuration
    logger.info('Step 4: Backing up git configuration');
    const gitConfigBackup = await gitManager.backupGitConfig();
    if (result.backupInfo) {
      result.backupInfo.gitConfig = gitConfigBackup;
    }

    // Step 5: Disable hooks
    if (inputs.disableHooks) {
      logger.info('Step 5: Disabling git hooks');

      // Backup hooks if they exist
      await hookManager.backupHooks();

      // Disable hooks at git level
      await gitManager.disableHooks();

      // Disable husky hooks
      await hookManager.disableHooks();

      // Verify hooks are disabled
      const hooksDisabled = await validationManager.validateHooksDisabled();
      if (!hooksDisabled) {
        result.warnings.push('Hook disabling verification failed');
      }
    }

    // Step 6: Configure git for Copilot
    logger.info('Step 6: Configuring git for Copilot agent');
    await gitManager.setupCopilotUser();
    await gitManager.configureAuthentication();

    // Step 7: Disable linting tools
    logger.info('Step 7: Disabling linting tools');
    await configManager.disableLintingTools();

    // Step 8: Setup dependencies
    logger.info('Step 8: Setting up project dependencies');

    // Install Node.js dependencies if needed
    if (
      environmentInfo.projectType === 'node' ||
      environmentInfo.projectType === 'mixed'
    ) {
      const pmType = environmentInfo.packageManager as PackageManagerType;
      await packageManager.installDependencies(pmType, {
        skipScripts: true,
      });
    }

    // Setup Flutter if needed
    if (
      environmentInfo.projectType === 'flutter' ||
      environmentInfo.projectType === 'mixed'
    ) {
      await packageManager.setupFlutter();
    }

    // Step 9: Final validation
    logger.info('Step 9: Performing final validation');
    const gitAccess = await gitManager.verifyAccess();
    if (!gitAccess) {
      result.warnings.push('Git access verification failed');
    }

    const finalValidation = await validationManager.validateEnvironment();
    result.warnings.push(...finalValidation.warnings);

    // Mark as successful
    result.success = true;
    result.environmentReady = true;

    logger.info('✅ Copilot environment setup completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Setup failed', error);
    result.errors.push(errorMessage);
    result.success = false;

    // Attempt automatic rollback on failure
    if (result.backupInfo && inputs.backupConfigs) {
      logger.warn('Attempting automatic rollback due to setup failure');
      try {
        await rollbackSetup(result.backupInfo, inputs, logger);
        logger.info('Automatic rollback completed');
      } catch (rollbackError) {
        logger.error('Automatic rollback failed', rollbackError);
        result.errors.push(`Rollback failed: ${rollbackError}`);
      }
    }
  } finally {
    logger.endGroup();
  }

  return result;
}

async function rollbackSetup(
  backupInfo: BackupInfo,
  inputs: ActionInputs,
  logger: Logger
): Promise<void> {
  logger.startGroup('🔄 Rolling back setup changes');

  try {
    const backupManager = new BackupManager(logger, inputs.workingDirectory);
    const gitManager = new GitManager(logger, inputs.workingDirectory);
    const hookManager = new HookManager(logger, inputs.workingDirectory);
    const configManager = new ConfigManager(logger, inputs.workingDirectory);

    // Restore git configuration
    if (backupInfo.gitConfig) {
      await gitManager.restoreGitConfig(backupInfo.gitConfig);
    }

    // Restore hooks
    await hookManager.restoreHooks();
    await gitManager.enableHooks();

    // Restore configurations
    await configManager.enableLintingTools();

    // Restore backup
    if (backupInfo) {
      await backupManager.restoreBackup(backupInfo);
    }

    logger.info('Rollback completed successfully');
  } catch (error) {
    logger.error('Rollback failed', error);
    throw error;
  } finally {
    logger.endGroup();
  }
}
