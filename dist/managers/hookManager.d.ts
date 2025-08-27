import { Logger } from '../utils/logger';
export declare class HookManager {
    private logger;
    private workingDirectory;
    constructor(logger: Logger, workingDirectory?: string);
    detectHooks(): Promise<string[]>;
    backupHooks(): Promise<string>;
    disableHooks(): Promise<void>;
    restoreHooks(): Promise<void>;
    createNoOpHooks(): Promise<void>;
    verifyHooksDisabled(): Promise<boolean>;
    getHookStatus(): Promise<Record<string, boolean>>;
}
