import * as exec from '@actions/exec';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PackageManager as PackageManagerType } from '../types/enums';
import { Logger } from '../utils/logger';
import { CONSTANTS } from '../utils/constants';

export class PackageManager {
  constructor(
    private logger: Logger,
    private workingDirectory: string = '.'
  ) {}

  async detectPackageManager(): Promise<PackageManagerType> {
    this.logger.debug('Detecting package manager');

    // Check for lock files in order of preference
    const lockFiles = [
      { file: 'package-lock.json', manager: PackageManagerType.NPM },
      { file: 'pnpm-lock.yaml', manager: PackageManagerType.PNPM },
      { file: 'yarn.lock', manager: PackageManagerType.YARN },
    ];

    for (const { file, manager } of lockFiles) {
      try {
        await fs.access(path.join(this.workingDirectory, file));
        this.logger.debug(`Detected package manager: ${manager} (${file})`);
        return manager;
      } catch {
        // Continue checking
      }
    }

    // Default to npm if no lock files found
    this.logger.debug('No lock files found, defaulting to npm');
    return PackageManagerType.NPM;
  }

  async installDependencies(
    packageManager?: PackageManagerType,
    options: { skipScripts?: boolean; production?: boolean } = {}
  ): Promise<void> {
    const pm = packageManager || (await this.detectPackageManager());

    this.logger.startGroup(`Installing dependencies with ${pm}`);

    try {
      const args = this.buildInstallArgs(pm, options);

      await exec.exec(pm, args, {
        cwd: this.workingDirectory,
        env: {
          ...process.env,
          // Disable husky during install
          [CONSTANTS.HUSKY_ENV]: '0',
          SKIP_PREPARE: 'true',
        },
      });

      this.logger.info(`Dependencies installed successfully with ${pm}`);
    } catch (error) {
      this.logger.error(`Failed to install dependencies with ${pm}`, error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async setupFlutter(version?: string): Promise<void> {
    this.logger.startGroup('Setting up Flutter');

    try {
      // Check if Flutter is already installed
      try {
        await exec.exec('flutter', ['--version'], { silent: true });
        this.logger.info('Flutter is already available');
      } catch {
        this.logger.warn('Flutter not found in PATH');
        // Could implement Flutter installation here if needed
      }

      // Check if this is a Flutter project
      const pubspecPath = path.join(this.workingDirectory, 'pubspec.yaml');
      try {
        await fs.access(pubspecPath);
        this.logger.info('Flutter project detected');

        // Get dependencies
        await exec.exec('flutter', ['pub', 'get'], {
          cwd: this.workingDirectory,
        });

        // Run code generation if needed
        await this.runCodeGeneration();
      } catch {
        this.logger.debug('Not a Flutter project');
      }
    } catch (error) {
      this.logger.error('Failed to setup Flutter', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async runCodeGeneration(): Promise<void> {
    this.logger.startGroup('Running code generation');

    try {
      // Check if build_runner is configured
      const pubspecPath = path.join(this.workingDirectory, 'pubspec.yaml');
      const pubspecContent = await fs.readFile(pubspecPath, 'utf-8');

      if (pubspecContent.includes('build_runner:')) {
        this.logger.info('Running build_runner code generation');

        await exec.exec(
          'dart',
          [
            'run',
            'build_runner',
            'build',
            '--delete-conflicting-outputs',
          ],
          {
            cwd: this.workingDirectory,
          }
        );

        this.logger.info('Code generation completed');
      } else {
        this.logger.debug('No build_runner configuration found');
      }
    } catch (error) {
      this.logger.warn('Code generation failed (continuing anyway)', error);
      // Don't throw here as code generation failure shouldn't block Copilot
    } finally {
      this.logger.endGroup();
    }
  }

  async cleanInstall(packageManager?: PackageManagerType): Promise<void> {
    const pm = packageManager || (await this.detectPackageManager());

    this.logger.startGroup(`Performing clean install with ${pm}`);

    try {
      // Remove node_modules
      const nodeModulesPath = path.join(this.workingDirectory, 'node_modules');
      try {
        await fs.rm(nodeModulesPath, { recursive: true, force: true });
        this.logger.debug('Removed node_modules');
      } catch {
        // node_modules doesn't exist, that's fine
      }

      // Remove lock file if switching package managers
      if (pm !== (await this.detectPackageManager())) {
        const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
        for (const lockFile of lockFiles) {
          try {
            await fs.rm(path.join(this.workingDirectory, lockFile));
            this.logger.debug(`Removed ${lockFile}`);
          } catch {
            // Lock file doesn't exist, that's fine
          }
        }
      }

      // Clean package manager cache
      await this.cleanCache(pm);

      // Install dependencies
      await this.installDependencies(pm, { skipScripts: true });
    } catch (error) {
      this.logger.error(`Clean install failed with ${pm}`, error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async verifyInstallation(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(
        this.workingDirectory,
        CONSTANTS.PACKAGE_JSON
      );
      await fs.access(packageJsonPath);

      const nodeModulesPath = path.join(this.workingDirectory, 'node_modules');
      await fs.access(nodeModulesPath);

      this.logger.debug('Package installation verified');
      return true;
    } catch {
      this.logger.debug('Package installation verification failed');
      return false;
    }
  }

  private buildInstallArgs(
    packageManager: PackageManagerType,
    options: { skipScripts?: boolean; production?: boolean }
  ): string[] {
    const args: string[] = [];

    switch (packageManager) {
      case PackageManagerType.NPM:
        args.push('install');
        if (options.skipScripts) args.push('--ignore-scripts');
        if (options.production) args.push('--production');
        break;

      case PackageManagerType.YARN:
        args.push('install');
        if (options.skipScripts) args.push('--ignore-scripts');
        if (options.production) args.push('--production');
        break;

      case PackageManagerType.PNPM:
        args.push('install');
        if (options.skipScripts) args.push('--ignore-scripts');
        if (options.production) args.push('--prod');
        break;
    }

    return args;
  }

  private async cleanCache(packageManager: PackageManagerType): Promise<void> {
    this.logger.debug(`Cleaning ${packageManager} cache`);

    try {
      switch (packageManager) {
        case PackageManagerType.NPM:
          await exec.exec('npm', ['cache', 'clean', '--force'], {
            cwd: this.workingDirectory,
            ignoreReturnCode: true,
          });
          break;

        case PackageManagerType.YARN:
          await exec.exec('yarn', ['cache', 'clean'], {
            cwd: this.workingDirectory,
            ignoreReturnCode: true,
          });
          break;

        case PackageManagerType.PNPM:
          await exec.exec('pnpm', ['store', 'prune'], {
            cwd: this.workingDirectory,
            ignoreReturnCode: true,
          });
          break;
      }
    } catch (error) {
      this.logger.debug(`Cache cleaning failed (continuing anyway): ${error}`);
    }
  }
}
