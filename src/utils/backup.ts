import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { BackupInfo, BackupFile, GitConfigBackup } from '../types/interfaces';
import { BackupFileType } from '../types/enums';
import { Logger } from './logger';
import { CONSTANTS } from './constants';

export class BackupManager {
  constructor(
    private logger: Logger,
    private workingDirectory: string = '.'
  ) {}

  async createBackup(): Promise<BackupInfo> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const backupDir = path.join(
      this.workingDirectory,
      `${CONSTANTS.BACKUP_DIR_PREFIX}-${backupId}`
    );

    this.logger.info(`Creating backup with ID: ${backupId}`);

    try {
      await fs.mkdir(backupDir, { recursive: true });

      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp,
        location: backupDir,
        files: [],
        gitConfig: { originalConfigs: {} },
      };

      // Backup files and directories
      await this.backupFiles(backupInfo);

      // Save backup manifest
      await this.saveBackupManifest(backupInfo);

      this.logger.info(`Backup created successfully at: ${backupDir}`);
      return backupInfo;
    } catch (error) {
      this.logger.error('Failed to create backup', error);
      throw error;
    }
  }

  async restoreBackup(backupInfo: BackupInfo): Promise<void> {
    this.logger.info(`Restoring backup: ${backupInfo.id}`);

    try {
      // Restore files
      for (const file of backupInfo.files) {
        await this.restoreFile(file, backupInfo.location);
      }

      // Clean up backup directory
      await fs.rm(backupInfo.location, { recursive: true, force: true });

      this.logger.info('Backup restored successfully');
    } catch (error) {
      this.logger.error('Failed to restore backup', error);
      throw error;
    }
  }

  async loadBackupManifest(backupLocation: string): Promise<BackupInfo> {
    const manifestPath = path.join(
      backupLocation,
      CONSTANTS.BACKUP_MANIFEST_FILE
    );

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(manifestContent) as BackupInfo;
    } catch (error) {
      this.logger.error('Failed to load backup manifest', error);
      throw error;
    }
  }

  private async backupFiles(backupInfo: BackupInfo): Promise<void> {
    const itemsToBackup = [
      // Husky directory
      {
        source: path.join(this.workingDirectory, CONSTANTS.HUSKY_DIR),
        type: BackupFileType.DIRECTORY,
      },
      // Package.json
      {
        source: path.join(this.workingDirectory, CONSTANTS.PACKAGE_JSON),
        type: BackupFileType.FILE,
      },
      // Commitlint configs
      ...CONSTANTS.COMMITLINT_CONFIG_PATTERNS.map(pattern => ({
        source: path.join(this.workingDirectory, pattern),
        type: BackupFileType.FILE,
      })),
    ];

    for (const item of itemsToBackup) {
      try {
        await fs.access(item.source);
        await this.backupItem(item.source, item.type, backupInfo);
      } catch {
        // Item doesn't exist, skip it
        this.logger.debug(`Skipping non-existent item: ${item.source}`);
      }
    }
  }

  private async backupItem(
    sourcePath: string,
    type: BackupFileType,
    backupInfo: BackupInfo
  ): Promise<void> {
    const relativePath = path.relative(this.workingDirectory, sourcePath);
    const backupPath = path.join(backupInfo.location, relativePath);
    const backupDir = path.dirname(backupPath);

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    if (type === BackupFileType.DIRECTORY) {
      await fs.cp(sourcePath, backupPath, { recursive: true });
    } else {
      await fs.copyFile(sourcePath, backupPath);
    }

    // Calculate checksum for files
    let checksum: string | undefined;
    if (type === BackupFileType.FILE) {
      const content = await fs.readFile(sourcePath);
      checksum = crypto.createHash('sha256').update(content).digest('hex');
    }

    const backupFile: BackupFile = {
      path: backupPath,
      originalPath: sourcePath,
      type,
      checksum,
    };

    backupInfo.files.push(backupFile);
    this.logger.debug(`Backed up: ${sourcePath} -> ${backupPath}`);
  }

  private async restoreFile(
    file: BackupFile,
    backupLocation: string
  ): Promise<void> {
    const { path: backupPath, originalPath, type } = file;

    try {
      if (type === BackupFileType.DIRECTORY) {
        // Remove existing directory if it exists
        try {
          await fs.rm(originalPath, { recursive: true, force: true });
        } catch {
          // Directory doesn't exist, that's fine
        }

        // Restore directory
        await fs.cp(backupPath, originalPath, { recursive: true });
      } else {
        // Restore file
        await fs.copyFile(backupPath, originalPath);
      }

      this.logger.debug(`Restored: ${backupPath} -> ${originalPath}`);
    } catch (error) {
      this.logger.error(`Failed to restore ${originalPath}`, error);
      throw error;
    }
  }

  private async saveBackupManifest(backupInfo: BackupInfo): Promise<void> {
    const manifestPath = path.join(
      backupInfo.location,
      CONSTANTS.BACKUP_MANIFEST_FILE
    );
    const manifestContent = JSON.stringify(backupInfo, null, 2);

    await fs.writeFile(manifestPath, manifestContent, 'utf-8');
    this.logger.debug(`Backup manifest saved: ${manifestPath}`);
  }

  async cleanupOldBackups(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    this.logger.debug('Cleaning up old backups');

    try {
      const files = await fs.readdir(this.workingDirectory);
      const backupDirs = files.filter(file =>
        file.startsWith(CONSTANTS.BACKUP_DIR_PREFIX)
      );

      const now = Date.now();

      for (const backupDir of backupDirs) {
        const backupPath = path.join(this.workingDirectory, backupDir);
        const stats = await fs.stat(backupPath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.rm(backupPath, { recursive: true, force: true });
          this.logger.debug(`Removed old backup: ${backupPath}`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup old backups', error);
    }
  }
}
