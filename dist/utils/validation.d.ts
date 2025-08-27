import { ValidationResult, EnvironmentInfo } from '../types/interfaces';
import { Logger } from './logger';
export declare class ValidationManager {
    private logger;
    private workingDirectory;
    constructor(logger: Logger, workingDirectory?: string);
    validateEnvironment(): Promise<ValidationResult>;
    detectEnvironment(): Promise<EnvironmentInfo>;
    validateGitAccess(): Promise<ValidationResult>;
    validateHooksDisabled(): Promise<boolean>;
    private validateWorkingDirectory;
    private validateGitInstallation;
    private validateGitHubEnvironment;
    private validateNodeEnvironment;
    private isCopilotAgent;
    private hasHuskyHooks;
    private hasCommitlint;
    private hasLintStaged;
    private detectPackageManager;
    private detectProjectType;
}
