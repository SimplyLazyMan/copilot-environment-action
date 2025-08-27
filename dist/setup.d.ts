import { SetupResult, ActionInputs } from './types/interfaces';
import { Logger } from './utils/logger';
export declare function setupEnvironment(inputs: ActionInputs, logger: Logger): Promise<SetupResult>;
