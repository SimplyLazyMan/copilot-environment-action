import { CleanupResult, ActionInputs } from './types/interfaces';
import { Logger } from './utils/logger';
export declare function cleanupEnvironment(inputs: ActionInputs, logger: Logger): Promise<CleanupResult>;
export declare function performEmergencyCleanup(workingDirectory: string, logger: Logger): Promise<void>;
