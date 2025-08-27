import { GitConfigBackup } from '../types/interfaces';
import { Logger } from '../utils/logger';
export declare class GitManager {
    private logger;
    private workingDirectory;
    constructor(logger: Logger, workingDirectory?: string);
    setupCopilotUser(): Promise<void>;
    configureAuthentication(): Promise<void>;
    disableHooks(): Promise<void>;
    enableHooks(): Promise<void>;
    backupGitConfig(): Promise<GitConfigBackup>;
    restoreGitConfig(backup: GitConfigBackup): Promise<void>;
    verifyAccess(): Promise<boolean>;
    private getGitConfig;
}
