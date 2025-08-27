import { Logger } from '../utils/logger';
export interface RuntimeInfo {
    flutter: {
        installed: boolean;
        version?: string;
        channel?: string;
        path?: string;
    };
    node: {
        installed: boolean;
        version?: string;
        path?: string;
    };
    npm: {
        installed: boolean;
        version?: string;
    };
}
export declare class RuntimeManager {
    private logger;
    private workingDirectory;
    constructor(logger: Logger, workingDirectory?: string);
    checkRuntimes(): Promise<RuntimeInfo>;
    setupFlutter(requiredVersion: string): Promise<boolean>;
    setupNode(requiredVersion: string): Promise<boolean>;
    private checkFlutter;
    private checkNode;
    private checkNpm;
    private installFlutter;
    private installFlutterWindows;
    private installFlutterUnix;
    private installNode;
    private installNodeWindows;
    private installNodeUnix;
    normalizeVersion(version: string): string;
    extractMajorVersion(version: string): string;
    validateProjectType(): Promise<string>;
}
