import * as exec from '@actions/exec';
import * as core from '@actions/core';
import { GitConfigBackup } from '../types/interfaces';
import { Logger } from '../utils/logger';
import { CONSTANTS, ERROR_MESSAGES } from '../utils/constants';

export class GitManager {
  constructor(
    private logger: Logger,
    private workingDirectory: string = '.'
  ) {}

  async setupCopilotUser(): Promise<void> {
    this.logger.startGroup('Configuring git user for Copilot agent');

    try {
      await exec.exec(
        'git',
        ['config', '--global', 'user.name', CONSTANTS.COPILOT_USER_NAME],
        { cwd: this.workingDirectory }
      );

      await exec.exec(
        'git',
        ['config', '--global', 'user.email', CONSTANTS.COPILOT_USER_EMAIL],
        { cwd: this.workingDirectory }
      );

      this.logger.info(`Git user configured: ${CONSTANTS.COPILOT_USER_NAME}`);
    } catch (error) {
      this.logger.error('Failed to configure git user', error);
      throw new Error(ERROR_MESSAGES.GIT_CONFIG_FAILED);
    } finally {
      this.logger.endGroup();
    }
  }

  async configureAuthentication(): Promise<void> {
    this.logger.startGroup('Configuring git authentication');

    try {
      const token =
        process.env[CONSTANTS.GITHUB_TOKEN_ENV] || core.getInput('token');
      if (!token) {
        throw new Error(ERROR_MESSAGES.GITHUB_TOKEN_MISSING);
      }

      // Hide the token in logs
      this.logger.setSecret(token);

      const repository = process.env[CONSTANTS.GITHUB_REPOSITORY_ENV];
      if (!repository) {
        throw new Error(ERROR_MESSAGES.GITHUB_REPOSITORY_MISSING);
      }

      // Configure remote URL with token
      const authUrl = `https://x-access-token:${token}@github.com/${repository}.git`;
      await exec.exec('git', ['remote', 'set-url', 'origin', authUrl], {
        cwd: this.workingDirectory,
      });

      // Configure git to store credentials
      await exec.exec(
        'git',
        ['config', '--global', 'credential.helper', 'store'],
        {
          cwd: this.workingDirectory,
        }
      );

      this.logger.info('Git authentication configured successfully');
    } catch (error) {
      this.logger.error('Failed to configure git authentication', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async disableHooks(): Promise<void> {
    this.logger.startGroup('Disabling git hooks');

    try {
      const hooksPath =
        process.platform === 'win32'
          ? CONSTANTS.WINDOWS_HOOKS_DISABLED_PATH
          : CONSTANTS.HOOKS_DISABLED_PATH;

      // Set hooks path to null device
      await exec.exec('git', ['config', 'core.hooksPath', hooksPath], {
        cwd: this.workingDirectory,
      });

      await exec.exec(
        'git',
        ['config', '--global', 'core.hooksPath', hooksPath],
        {
          cwd: this.workingDirectory,
        }
      );

      this.logger.info(`Git hooks disabled (hooksPath: ${hooksPath})`);
    } catch (error) {
      this.logger.error('Failed to disable git hooks', error);
      throw new Error(ERROR_MESSAGES.HOOKS_DISABLE_FAILED);
    } finally {
      this.logger.endGroup();
    }
  }

  async enableHooks(): Promise<void> {
    this.logger.startGroup('Re-enabling git hooks');

    try {
      // Reset hooks path
      await exec.exec('git', ['config', '--unset', 'core.hooksPath'], {
        cwd: this.workingDirectory,
        ignoreReturnCode: true, // Don't fail if config doesn't exist
      });

      await exec.exec(
        'git',
        ['config', '--global', '--unset', 'core.hooksPath'],
        {
          cwd: this.workingDirectory,
          ignoreReturnCode: true, // Don't fail if config doesn't exist
        }
      );

      this.logger.info('Git hooks re-enabled');
    } catch (error) {
      this.logger.error('Failed to re-enable git hooks', error);
      throw new Error(ERROR_MESSAGES.HOOKS_RESTORE_FAILED);
    } finally {
      this.logger.endGroup();
    }
  }

  async backupGitConfig(): Promise<GitConfigBackup> {
    this.logger.info('Backing up git configuration');

    const backup: GitConfigBackup = {
      originalConfigs: {},
    };

    try {
      // Backup current user name
      backup.userName = await this.getGitConfig('user.name');

      // Backup current user email
      backup.userEmail = await this.getGitConfig('user.email');

      // Backup current hooks path
      backup.hooksPath = await this.getGitConfig('core.hooksPath');

      // Backup remote URL
      backup.remoteUrl = await this.getGitConfig('remote.origin.url');

      // Backup additional configs
      const additionalConfigs = [
        'credential.helper',
        'core.autocrlf',
        'core.safecrlf',
        'pull.rebase',
      ];

      for (const configKey of additionalConfigs) {
        const value = await this.getGitConfig(configKey);
        if (value) {
          backup.originalConfigs[configKey] = value;
        }
      }

      this.logger.debug('Git configuration backed up', backup);
      return backup;
    } catch (error) {
      this.logger.error('Failed to backup git configuration', error);
      throw error;
    }
  }

  async restoreGitConfig(backup: GitConfigBackup): Promise<void> {
    this.logger.startGroup('Restoring git configuration');

    try {
      // Restore user name
      if (backup.userName) {
        await exec.exec(
          'git',
          ['config', '--global', 'user.name', backup.userName],
          {
            cwd: this.workingDirectory,
          }
        );
      }

      // Restore user email
      if (backup.userEmail) {
        await exec.exec(
          'git',
          ['config', '--global', 'user.email', backup.userEmail],
          {
            cwd: this.workingDirectory,
          }
        );
      }

      // Restore hooks path
      if (backup.hooksPath) {
        await exec.exec('git', ['config', 'core.hooksPath', backup.hooksPath], {
          cwd: this.workingDirectory,
        });
      } else {
        // Unset if it wasn't set before
        await exec.exec('git', ['config', '--unset', 'core.hooksPath'], {
          cwd: this.workingDirectory,
          ignoreReturnCode: true,
        });
      }

      // Restore remote URL
      if (backup.remoteUrl) {
        await exec.exec(
          'git',
          ['remote', 'set-url', 'origin', backup.remoteUrl],
          {
            cwd: this.workingDirectory,
          }
        );
      }

      // Restore additional configs
      for (const [key, value] of Object.entries(backup.originalConfigs)) {
        await exec.exec('git', ['config', '--global', key, value], {
          cwd: this.workingDirectory,
        });
      }

      this.logger.info('Git configuration restored successfully');
    } catch (error) {
      this.logger.error('Failed to restore git configuration', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async verifyAccess(): Promise<boolean> {
    try {
      this.logger.info('Verifying git push access');

      const exitCode = await exec.exec('git', ['push', '--dry-run'], {
        cwd: this.workingDirectory,
        ignoreReturnCode: true,
      });

      const hasAccess = exitCode === 0;
      this.logger.info(
        `Git access verification: ${hasAccess ? 'SUCCESS' : 'FAILED'}`
      );

      return hasAccess;
    } catch (error) {
      this.logger.warn(`Git access verification failed: ${error}`);
      return false;
    }
  }

  async hasChanges(): Promise<boolean> {
    try {
      this.logger.debug('Checking for git changes');

      let output = '';
      await exec.exec('git', ['status', '--porcelain'], {
        cwd: this.workingDirectory,
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      });

      const hasChanges = output.trim().length > 0;
      this.logger.debug(`Git changes detected: ${hasChanges}`);

      return hasChanges;
    } catch (error) {
      this.logger.warn(`Failed to check git changes: ${error}`);
      return false;
    }
  }

  async commitChanges(message: string): Promise<boolean> {
    this.logger.startGroup('Committing changes');

    try {
      // First check if there are any changes to commit
      const hasChanges = await this.hasChanges();
      if (!hasChanges) {
        this.logger.info('No changes to commit');
        return true;
      }

      // Add all changes
      await exec.exec('git', ['add', '.'], {
        cwd: this.workingDirectory,
      });

      // Commit changes
      await exec.exec('git', ['commit', '-m', message], {
        cwd: this.workingDirectory,
      });

      this.logger.info(
        `Successfully committed changes with message: "${message}"`
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to commit changes', error);
      return false;
    } finally {
      this.logger.endGroup();
    }
  }

  async pushChanges(branch: string = 'main'): Promise<boolean> {
    this.logger.startGroup('Pushing changes');

    try {
      // Check if we have access first
      const hasAccess = await this.verifyAccess();
      if (!hasAccess) {
        this.logger.warn('Git push access verification failed');
        return false;
      }

      // Get current branch
      let currentBranch = '';
      await exec.exec('git', ['branch', '--show-current'], {
        cwd: this.workingDirectory,
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            currentBranch = data.toString().trim();
          },
        },
      });

      // If current branch is different from target, warn but proceed
      if (currentBranch && currentBranch !== branch) {
        this.logger.warn(
          `Current branch (${currentBranch}) differs from target branch (${branch})`
        );
      }

      // Push changes
      const pushBranch = currentBranch || branch;
      await exec.exec('git', ['push', 'origin', pushBranch], {
        cwd: this.workingDirectory,
      });

      this.logger.info(`Successfully pushed changes to ${pushBranch}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to push changes', error);
      return false;
    } finally {
      this.logger.endGroup();
    }
  }

  async commitAndPush(
    message: string,
    branch: string = 'main'
  ): Promise<boolean> {
    try {
      this.logger.info('Starting commit and push operation');

      // First commit the changes
      const commitSuccess = await this.commitChanges(message);
      if (!commitSuccess) {
        this.logger.error('Commit failed, skipping push');
        return false;
      }

      // Then push the changes
      const pushSuccess = await this.pushChanges(branch);
      if (!pushSuccess) {
        this.logger.error('Push failed');
        return false;
      }

      this.logger.info('Successfully committed and pushed changes');
      return true;
    } catch (error) {
      this.logger.error('Commit and push operation failed', error);
      return false;
    }
  }

  private async getGitConfig(key: string): Promise<string | undefined> {
    try {
      let output = '';

      await exec.exec('git', ['config', key], {
        cwd: this.workingDirectory,
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      });

      return output.trim() || undefined;
    } catch {
      return undefined;
    }
  }
}
