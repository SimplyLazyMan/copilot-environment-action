import { BackupInfo } from '../types/interfaces';
import { Logger } from './logger';
export declare class BackupManager {
    private logger;
    private workingDirectory;
    constructor(logger: Logger, workingDirectory?: string);
    createBackup(): Promise<BackupInfo>;
    restoreBackup(backupInfo: BackupInfo): Promise<void>;
    loadBackupManifest(backupLocation: string): Promise<BackupInfo>;
    private backupFiles;
    private backupItem;
    private restoreFile;
    private saveBackupManifest;
    cleanupOldBackups(maxAge?: number): Promise<void>;
}
