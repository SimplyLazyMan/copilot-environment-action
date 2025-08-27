export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum OperationType {
  SETUP = 'setup',
  CLEANUP = 'cleanup',
  AUTO = 'auto',
}

export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
}

export enum ProjectType {
  FLUTTER = 'flutter',
  NODE = 'node',
  MIXED = 'mixed',
}

export enum BackupFileType {
  FILE = 'file',
  DIRECTORY = 'directory',
}

export enum ConfigType {
  JSON = 'json',
  TEXT = 'text',
  ENV = 'env',
}
