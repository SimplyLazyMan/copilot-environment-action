import { ConfigModification } from '../types/interfaces';
import { Logger } from '../utils/logger';
export declare class ConfigManager {
    private logger;
    private workingDirectory;
    constructor(logger: Logger, workingDirectory?: string);
    backupConfigs(): Promise<Record<string, any>>;
    modifyConfigs(modifications: ConfigModification[]): Promise<void>;
    restoreConfigs(backups: Record<string, any>): Promise<void>;
    disableLintingTools(): Promise<void>;
    enableLintingTools(): Promise<void>;
    private backupPackageJson;
    private restorePackageJson;
    private disablePackageJsonScripts;
    private backupEnvironment;
    private restoreEnvironment;
    private applyModification;
    private modifyJsonFile;
    private modifyTextFile;
    private modifyEnvironment;
    private deepMerge;
}
