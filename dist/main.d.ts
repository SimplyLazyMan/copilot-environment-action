import { ActionInputs } from './types/interfaces';
declare function run(): Promise<void>;
declare function cleanup(): Promise<void>;
declare function parseInputs(): ActionInputs;
export { run, cleanup, parseInputs };
