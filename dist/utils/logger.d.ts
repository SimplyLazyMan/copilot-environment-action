import { LogLevel } from '../types/enums';
export declare class Logger {
    private debugEnabled;
    constructor(debug?: boolean);
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error | any): void;
    startGroup(name: string): void;
    endGroup(): void;
    setSecret(secret: string): void;
    logWithLevel(level: LogLevel, message: string, data?: any): void;
}
