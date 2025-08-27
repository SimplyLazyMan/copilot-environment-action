import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigModification } from '../types/interfaces';
import { ConfigType } from '../types/enums';
import { Logger } from '../utils/logger';
import { CONSTANTS } from '../utils/constants';

interface PackageJsonBackup {
  scripts?: Record<string, string>;
  husky?: any;
  'lint-staged'?: any;
  commitlint?: any;
}

export class ConfigManager {
  constructor(
    private logger: Logger,
    private workingDirectory: string = '.'
  ) {}

  async backupConfigs(): Promise<Record<string, any>> {
    this.logger.startGroup('Backing up configurations');

    const backups: Record<string, any> = {};

    try {
      // Backup package.json
      const packageJsonBackup = await this.backupPackageJson();
      if (packageJsonBackup) {
        backups.packageJson = packageJsonBackup;
      }

      // Backup environment variables
      backups.environment = this.backupEnvironment();

      this.logger.info('Configurations backed up successfully');
      return backups;
    } catch (error) {
      this.logger.error('Failed to backup configurations', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async modifyConfigs(modifications: ConfigModification[]): Promise<void> {
    this.logger.startGroup('Modifying configurations');

    try {
      for (const modification of modifications) {
        await this.applyModification(modification);
      }

      this.logger.info(
        `Applied ${modifications.length} configuration modifications`
      );
    } catch (error) {
      this.logger.error('Failed to modify configurations', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async restoreConfigs(backups: Record<string, any>): Promise<void> {
    this.logger.startGroup('Restoring configurations');

    try {
      // Restore package.json
      if (backups.packageJson) {
        await this.restorePackageJson(backups.packageJson);
      }

      // Restore environment variables
      if (backups.environment) {
        this.restoreEnvironment(backups.environment);
      }

      this.logger.info('Configurations restored successfully');
    } catch (error) {
      this.logger.error('Failed to restore configurations', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async disableLintingTools(): Promise<void> {
    this.logger.startGroup('Disabling linting tools');

    try {
      // Set environment variables to disable tools
      process.env[CONSTANTS.HUSKY_ENV] = '0';
      process.env['SKIP_PREPARE'] = 'true';
      process.env['SKIP_POSTINSTALL'] = 'true';
      process.env['CI'] = 'true'; // Many tools check this to disable interactive features

      // Modify package.json to disable scripts
      await this.disablePackageJsonScripts();

      this.logger.info('Linting tools disabled');
    } catch (error) {
      this.logger.error('Failed to disable linting tools', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async enableLintingTools(): Promise<void> {
    this.logger.startGroup('Re-enabling linting tools');

    try {
      // Remove environment variables
      delete process.env[CONSTANTS.HUSKY_ENV];
      delete process.env['SKIP_PREPARE'];
      delete process.env['SKIP_POSTINSTALL'];
      // Note: We don't unset CI as it might be legitimately set

      this.logger.info('Linting tools re-enabled');
    } catch (error) {
      this.logger.error('Failed to re-enable linting tools', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  private async backupPackageJson(): Promise<PackageJsonBackup | null> {
    const packageJsonPath = path.join(
      this.workingDirectory,
      CONSTANTS.PACKAGE_JSON
    );

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      const backup: PackageJsonBackup = {};

      // Backup relevant sections
      if (packageJson.scripts) {
        backup.scripts = { ...packageJson.scripts };
      }

      if (packageJson.husky) {
        backup.husky = JSON.parse(JSON.stringify(packageJson.husky));
      }

      if (packageJson['lint-staged']) {
        backup['lint-staged'] = JSON.parse(
          JSON.stringify(packageJson['lint-staged'])
        );
      }

      if (packageJson.commitlint) {
        backup.commitlint = JSON.parse(JSON.stringify(packageJson.commitlint));
      }

      this.logger.debug('Package.json backed up');
      return backup;
    } catch {
      this.logger.debug('No package.json found or failed to backup');
      return null;
    }
  }

  private async restorePackageJson(backup: PackageJsonBackup): Promise<void> {
    const packageJsonPath = path.join(
      this.workingDirectory,
      CONSTANTS.PACKAGE_JSON
    );

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      // Restore backed up sections
      if (backup.scripts) {
        packageJson.scripts = { ...backup.scripts };
      }

      if (backup.husky) {
        packageJson.husky = backup.husky;
      } else {
        delete packageJson.husky;
      }

      if (backup['lint-staged']) {
        packageJson['lint-staged'] = backup['lint-staged'];
      } else {
        delete packageJson['lint-staged'];
      }

      if (backup.commitlint) {
        packageJson.commitlint = backup.commitlint;
      } else {
        delete packageJson.commitlint;
      }

      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2),
        'utf-8'
      );
      this.logger.debug('Package.json restored');
    } catch (error) {
      this.logger.warn('Failed to restore package.json', error);
    }
  }

  private async disablePackageJsonScripts(): Promise<void> {
    const packageJsonPath = path.join(
      this.workingDirectory,
      CONSTANTS.PACKAGE_JSON
    );

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      // Disable problematic scripts by prefixing with a comment
      if (packageJson.scripts) {
        const scriptsToDisable = [
          'prepare',
          'postinstall',
          'precommit',
          'prepush',
        ];

        for (const scriptName of scriptsToDisable) {
          if (packageJson.scripts[scriptName]) {
            packageJson.scripts[`${scriptName}.disabled`] =
              packageJson.scripts[scriptName];
            packageJson.scripts[scriptName] =
              'echo "Script disabled by Copilot Environment Action"';
          }
        }
      }

      // Temporarily disable husky and lint-staged configurations
      if (packageJson.husky) {
        packageJson['husky.disabled'] = packageJson.husky;
        delete packageJson.husky;
      }

      if (packageJson['lint-staged']) {
        packageJson['lint-staged.disabled'] = packageJson['lint-staged'];
        delete packageJson['lint-staged'];
      }

      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2),
        'utf-8'
      );
      this.logger.debug('Package.json scripts disabled');
    } catch {
      this.logger.debug('No package.json found or failed to modify');
    }
  }

  private backupEnvironment(): Record<string, string> {
    const envVarsToBackup = [
      CONSTANTS.HUSKY_ENV,
      'SKIP_PREPARE',
      'SKIP_POSTINSTALL',
      'CI',
    ];

    const backup: Record<string, string> = {};

    for (const varName of envVarsToBackup) {
      const value = process.env[varName];
      if (value !== undefined) {
        backup[varName] = value;
      }
    }

    return backup;
  }

  private restoreEnvironment(backup: Record<string, string>): void {
    // First, remove variables that we set
    delete process.env[CONSTANTS.HUSKY_ENV];
    delete process.env['SKIP_PREPARE'];
    delete process.env['SKIP_POSTINSTALL'];

    // Then restore original values
    for (const [varName, value] of Object.entries(backup)) {
      process.env[varName] = value;
    }
  }

  private async applyModification(
    modification: ConfigModification
  ): Promise<void> {
    const filePath = path.resolve(this.workingDirectory, modification.path);

    try {
      switch (modification.type) {
        case ConfigType.JSON:
          await this.modifyJsonFile(filePath, modification.changes);
          break;
        case ConfigType.TEXT:
          await this.modifyTextFile(filePath, modification.changes);
          break;
        case ConfigType.ENV:
          this.modifyEnvironment(modification.changes);
          break;
        default:
          throw new Error(
            `Unsupported modification type: ${modification.type}`
          );
      }

      this.logger.debug(`Applied modification to: ${modification.path}`);
    } catch (error) {
      this.logger.error(
        `Failed to apply modification to ${modification.path}`,
        error
      );
      throw error;
    }
  }

  private async modifyJsonFile(
    filePath: string,
    changes: Record<string, any>
  ): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(content);

    // Deep merge changes
    this.deepMerge(json, changes);

    await fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
  }

  private async modifyTextFile(
    filePath: string,
    changes: Record<string, any>
  ): Promise<void> {
    let content = await fs.readFile(filePath, 'utf-8');

    for (const [search, replace] of Object.entries(changes)) {
      content = content.replace(new RegExp(search, 'g'), String(replace));
    }

    await fs.writeFile(filePath, content, 'utf-8');
  }

  private modifyEnvironment(changes: Record<string, any>): void {
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = String(value);
      }
    }
  }

  private deepMerge(target: any, source: any): any {
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
}
