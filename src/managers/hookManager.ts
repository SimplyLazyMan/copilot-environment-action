import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { CONSTANTS } from '../utils/constants';

export class HookManager {
  constructor(
    private logger: Logger,
    private workingDirectory: string = '.'
  ) {}

  async detectHooks(): Promise<string[]> {
    const huskyDir = path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR);

    try {
      await fs.access(huskyDir);
      const files = await fs.readdir(huskyDir);

      // Filter out hidden files and directories, and the _ file that husky uses
      const hooks = files.filter(
        file =>
          !file.startsWith('.') &&
          file !== '_' &&
          !file.endsWith('.md') &&
          !file.endsWith('.txt')
      );

      this.logger.debug(`Detected hooks: ${hooks.join(', ')}`);
      return hooks;
    } catch {
      this.logger.debug('No husky directory found');
      return [];
    }
  }

  async backupHooks(): Promise<string> {
    const huskyDir = path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR);
    const backupDir = path.join(
      this.workingDirectory,
      CONSTANTS.HUSKY_BACKUP_DIR
    );

    this.logger.startGroup('Backing up git hooks');

    try {
      await fs.access(huskyDir);

      // Remove existing backup if it exists
      try {
        await fs.rm(backupDir, { recursive: true, force: true });
      } catch {
        // Backup doesn't exist, that's fine
      }

      // Create backup
      await fs.cp(huskyDir, backupDir, { recursive: true });

      this.logger.info(`Hooks backed up to ${backupDir}`);
      return backupDir;
    } catch {
      this.logger.info('No hooks to backup');
      return '';
    } finally {
      this.logger.endGroup();
    }
  }

  async disableHooks(): Promise<void> {
    const huskyDir = path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR);

    this.logger.startGroup('Disabling git hooks');

    try {
      const hooks = await this.detectHooks();

      if (hooks.length === 0) {
        this.logger.info('No hooks found to disable');
        return;
      }

      for (const hook of hooks) {
        const hookPath = path.join(huskyDir, hook);

        try {
          // Check if it's a file (not a directory)
          const stats = await fs.stat(hookPath);
          if (stats.isFile()) {
            // Replace hook content with no-op
            await fs.writeFile(hookPath, CONSTANTS.NOOP_HOOK_CONTENT, {
              mode: 0o755,
            });

            this.logger.debug(`Disabled hook: ${hook}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to disable hook ${hook}`, error);
        }
      }

      this.logger.info(`Disabled ${hooks.length} hooks`);
    } catch (error) {
      this.logger.error('Failed to disable hooks', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async restoreHooks(): Promise<void> {
    const huskyDir = path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR);
    const backupDir = path.join(
      this.workingDirectory,
      CONSTANTS.HUSKY_BACKUP_DIR
    );

    this.logger.startGroup('Restoring git hooks');

    try {
      await fs.access(backupDir);

      // Remove current hooks directory
      try {
        await fs.rm(huskyDir, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, that's fine
      }

      // Restore from backup
      await fs.cp(backupDir, huskyDir, { recursive: true });

      // Clean up backup
      await fs.rm(backupDir, { recursive: true, force: true });

      this.logger.info('Hooks restored successfully');
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        this.logger.info('No backup found - hooks were not backed up');
      } else {
        this.logger.error('Failed to restore hooks', error);
        throw error;
      }
    } finally {
      this.logger.endGroup();
    }
  }

  async createNoOpHooks(): Promise<void> {
    const huskyDir = path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR);

    this.logger.startGroup('Creating no-op hooks');

    try {
      // Ensure husky directory exists
      await fs.mkdir(huskyDir, { recursive: true });

      // Create no-op hooks for common hook types
      for (const hookName of CONSTANTS.COMMON_HOOKS) {
        const hookPath = path.join(huskyDir, hookName);

        await fs.writeFile(hookPath, CONSTANTS.NOOP_HOOK_CONTENT, {
          mode: 0o755,
        });

        this.logger.debug(`Created no-op hook: ${hookName}`);
      }

      this.logger.info(`Created ${CONSTANTS.COMMON_HOOKS.length} no-op hooks`);
    } catch (error) {
      this.logger.error('Failed to create no-op hooks', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async verifyHooksDisabled(): Promise<boolean> {
    const huskyDir = path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR);

    try {
      const hooks = await this.detectHooks();

      if (hooks.length === 0) {
        return true; // No hooks to check
      }

      for (const hook of hooks) {
        const hookPath = path.join(huskyDir, hook);

        try {
          const content = await fs.readFile(hookPath, 'utf-8');

          // Check if the hook contains the no-op content
          if (!content.includes('Disabled by Copilot Environment Action')) {
            this.logger.debug(`Hook ${hook} is not disabled`);
            return false;
          }
        } catch {
          // If we can't read the hook, assume it's problematic
          return false;
        }
      }

      this.logger.debug('All hooks are properly disabled');
      return true;
    } catch (error) {
      this.logger.warn('Failed to verify hooks disabled status', error);
      return false;
    }
  }

  async getHookStatus(): Promise<Record<string, boolean>> {
    const huskyDir = path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR);
    const status: Record<string, boolean> = {};

    try {
      const hooks = await this.detectHooks();

      for (const hook of hooks) {
        const hookPath = path.join(huskyDir, hook);

        try {
          const content = await fs.readFile(hookPath, 'utf-8');
          status[hook] = content.includes(
            'Disabled by Copilot Environment Action'
          );
        } catch {
          status[hook] = false;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to get hook status', error);
    }

    return status;
  }
}
