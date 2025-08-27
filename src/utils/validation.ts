import * as fs from 'fs/promises';
import * as path from 'path';
import * as exec from '@actions/exec';
import { ValidationResult, EnvironmentInfo } from '../types/interfaces';
import { PackageManager, ProjectType } from '../types/enums';
import { Logger } from './logger';
import { CONSTANTS, ERROR_MESSAGES } from './constants';

export class ValidationManager {
  constructor(
    private logger: Logger,
    private workingDirectory: string = '.'
  ) {}

  async validateEnvironment(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    this.logger.info('Validating environment');

    try {
      // Check working directory
      await this.validateWorkingDirectory(result);

      // Check git installation
      await this.validateGitInstallation(result);

      // Check GitHub environment
      await this.validateGitHubEnvironment(result);

      // Check Node.js environment
      await this.validateNodeEnvironment(result);

      this.logger.info(
        `Environment validation completed. Valid: ${result.isValid}`
      );
    } catch (error) {
      result.errors.push(`Validation failed: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  async detectEnvironment(): Promise<EnvironmentInfo> {
    this.logger.info('Detecting environment configuration');

    const environmentInfo: EnvironmentInfo = {
      isCopilotAgent: this.isCopilotAgent(),
      hasHuskyHooks: await this.hasHuskyHooks(),
      hasCommitlint: await this.hasCommitlint(),
      hasLintStaged: await this.hasLintStaged(),
      packageManager: await this.detectPackageManager(),
      projectType: await this.detectProjectType(),
      workingDirectory: this.workingDirectory,
    };

    this.logger.debug('Environment detected', environmentInfo);
    return environmentInfo;
  }

  async validateGitAccess(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Test git status
      await exec.exec('git', ['status', '--porcelain'], {
        cwd: this.workingDirectory,
        silent: true,
      });

      // Test git push access (dry run)
      const exitCode = await exec.exec('git', ['push', '--dry-run'], {
        cwd: this.workingDirectory,
        silent: true,
        ignoreReturnCode: true,
      });

      if (exitCode !== 0) {
        result.warnings.push(
          'Git push access test failed - may indicate authentication issues'
        );
      }
    } catch (error) {
      result.errors.push(`Git access validation failed: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  async validateHooksDisabled(): Promise<boolean> {
    try {
      // Check git config
      let hooksPath = '';
      await exec.exec('git', ['config', 'core.hooksPath'], {
        cwd: this.workingDirectory,
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            hooksPath += data.toString();
          },
        },
      });

      const isDisabled =
        hooksPath.trim() === CONSTANTS.HOOKS_DISABLED_PATH ||
        hooksPath.trim() === CONSTANTS.WINDOWS_HOOKS_DISABLED_PATH;

      this.logger.debug(
        `Hooks disabled status: ${isDisabled}, hooksPath: ${hooksPath.trim()}`
      );
      return isDisabled;
    } catch {
      return false;
    }
  }

  private async validateWorkingDirectory(
    result: ValidationResult
  ): Promise<void> {
    try {
      await fs.access(this.workingDirectory);
      const stats = await fs.stat(this.workingDirectory);

      if (!stats.isDirectory()) {
        result.errors.push(ERROR_MESSAGES.WORKING_DIRECTORY_INVALID);
        result.isValid = false;
      }
    } catch {
      result.errors.push(ERROR_MESSAGES.WORKING_DIRECTORY_INVALID);
      result.isValid = false;
    }
  }

  private async validateGitInstallation(
    result: ValidationResult
  ): Promise<void> {
    try {
      await exec.exec('git', ['--version'], { silent: true });
    } catch {
      result.errors.push('Git is not installed or not accessible');
      result.isValid = false;
    }
  }

  private async validateGitHubEnvironment(
    result: ValidationResult
  ): Promise<void> {
    if (!process.env[CONSTANTS.GITHUB_TOKEN_ENV]) {
      result.warnings.push('GitHub token not found in environment');
    }

    if (!process.env[CONSTANTS.GITHUB_REPOSITORY_ENV]) {
      result.warnings.push('GitHub repository not found in environment');
    }
  }

  private async validateNodeEnvironment(
    result: ValidationResult
  ): Promise<void> {
    try {
      await exec.exec('node', ['--version'], { silent: true });
    } catch {
      result.warnings.push('Node.js is not installed or not accessible');
    }

    try {
      await exec.exec('npm', ['--version'], { silent: true });
    } catch {
      result.warnings.push('npm is not installed or not accessible');
    }
  }

  private isCopilotAgent(): boolean {
    // Check various indicators that this is running in a Copilot context
    const userAgent = process.env.GITHUB_ACTOR;
    const workflowName = process.env.GITHUB_WORKFLOW;

    return (
      userAgent?.includes('copilot') ||
      userAgent?.includes('Copilot') ||
      workflowName?.includes('copilot') ||
      workflowName?.includes('Copilot') ||
      false
    );
  }

  private async hasHuskyHooks(): Promise<boolean> {
    try {
      const huskyPath = path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR);
      await fs.access(huskyPath);
      return true;
    } catch {
      return false;
    }
  }

  private async hasCommitlint(): Promise<boolean> {
    for (const configFile of CONSTANTS.COMMITLINT_CONFIG_PATTERNS) {
      try {
        await fs.access(path.join(this.workingDirectory, configFile));
        return true;
      } catch {
        // Continue checking other patterns
      }
    }

    // Check package.json for commitlint config
    try {
      const packageJsonPath = path.join(
        this.workingDirectory,
        CONSTANTS.PACKAGE_JSON
      );
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      return !!(
        packageJson.commitlint ||
        packageJson.devDependencies?.['@commitlint/cli'] ||
        packageJson.dependencies?.['@commitlint/cli']
      );
    } catch {
      return false;
    }
  }

  private async hasLintStaged(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(
        this.workingDirectory,
        CONSTANTS.PACKAGE_JSON
      );
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      return !!(
        packageJson['lint-staged'] ||
        packageJson.devDependencies?.['lint-staged'] ||
        packageJson.dependencies?.['lint-staged']
      );
    } catch {
      return false;
    }
  }

  private async detectPackageManager(): Promise<PackageManager> {
    // Check for lock files
    const lockFiles = [
      { file: 'pnpm-lock.yaml', manager: PackageManager.PNPM },
      { file: 'yarn.lock', manager: PackageManager.YARN },
      { file: 'package-lock.json', manager: PackageManager.NPM },
    ];

    for (const { file, manager } of lockFiles) {
      try {
        await fs.access(path.join(this.workingDirectory, file));
        return manager;
      } catch {
        // Continue checking
      }
    }

    return PackageManager.NPM; // Default fallback
  }

  private async detectProjectType(): Promise<ProjectType> {
    const indicators = [
      { file: 'pubspec.yaml', type: ProjectType.FLUTTER },
      { file: 'lib/main.dart', type: ProjectType.FLUTTER },
    ];

    let hasNodeProject = false;
    let hasFlutterProject = false;

    // Check for Flutter indicators
    for (const { file } of indicators) {
      try {
        await fs.access(path.join(this.workingDirectory, file));
        hasFlutterProject = true;
        break;
      } catch {
        // Continue checking
      }
    }

    // Check for Node.js project
    try {
      await fs.access(path.join(this.workingDirectory, CONSTANTS.PACKAGE_JSON));
      hasNodeProject = true;
    } catch {
      // Not a Node.js project
    }

    if (hasFlutterProject && hasNodeProject) {
      return ProjectType.MIXED;
    } else if (hasFlutterProject) {
      return ProjectType.FLUTTER;
    } else if (hasNodeProject) {
      return ProjectType.NODE;
    }

    return ProjectType.NODE; // Default fallback
  }
}
