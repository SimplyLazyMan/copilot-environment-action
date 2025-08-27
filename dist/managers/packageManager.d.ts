import { PackageManager as PackageManagerType } from '../types/enums';
import { Logger } from '../utils/logger';
export declare class PackageManager {
    private logger;
    private workingDirectory;
    constructor(logger: Logger, workingDirectory?: string);
    detectPackageManager(): Promise<PackageManagerType>;
    installDependencies(packageManager?: PackageManagerType, options?: {
        skipScripts?: boolean;
        production?: boolean;
    }): Promise<void>;
    setupFlutter(): Promise<void>;
    runCodeGeneration(): Promise<void>;
    cleanInstall(packageManager?: PackageManagerType): Promise<void>;
    verifyInstallation(): Promise<boolean>;
    private buildInstallArgs;
    private cleanCache;
}
