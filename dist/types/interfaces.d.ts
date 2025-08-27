export interface EnvironmentInfo {
    isCopilotAgent: boolean;
    hasHuskyHooks: boolean;
    hasCommitlint: boolean;
    hasLintStaged: boolean;
    packageManager: 'npm' | 'yarn' | 'pnpm';
    projectType: 'flutter' | 'node' | 'mixed';
    workingDirectory: string;
}
export interface BackupInfo {
    id: string;
    timestamp: string;
    location: string;
    files: BackupFile[];
    gitConfig: GitConfigBackup;
}
export interface BackupFile {
    path: string;
    originalPath: string;
    type: 'file' | 'directory';
    checksum?: string;
}
export interface GitConfigBackup {
    userName?: string;
    userEmail?: string;
    hooksPath?: string;
    remoteUrl?: string;
    originalConfigs: Record<string, string>;
}
export interface ConfigModification {
    path: string;
    type: 'json' | 'text' | 'env';
    changes: Record<string, any>;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export interface SetupResult {
    success: boolean;
    backupInfo?: BackupInfo;
    environmentReady: boolean;
    errors: string[];
    warnings: string[];
}
export interface CleanupResult {
    success: boolean;
    restored: boolean;
    errors: string[];
    warnings: string[];
}
export interface ActionInputs {
    operation: 'setup' | 'cleanup' | 'auto';
    flutterVersion: string;
    nodeVersion: string;
    disableHooks: boolean;
    backupConfigs: boolean;
    debug: boolean;
    workingDirectory: string;
}
export interface ActionOutputs {
    setupSuccessful: boolean;
    backupLocation: string;
    originalConfigs: string;
    hooksDisabled: boolean;
    environmentReady: boolean;
}
