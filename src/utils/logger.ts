import * as core from '@actions/core';
import { LogLevel } from '../types/enums';

export class Logger {
  private debugEnabled: boolean;

  constructor(debug: boolean = false) {
    this.debugEnabled = debug;
  }

  debug(message: string, data?: any): void {
    if (this.debugEnabled) {
      const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
      core.debug(logMessage);
    }
  }

  info(message: string, data?: any): void {
    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    core.info(logMessage);
  }

  warn(message: string, data?: any): void {
    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    core.warning(logMessage);
  }

  error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      core.error(`${message}: ${error.message}`);
      if (this.debugEnabled && error.stack) {
        core.debug(`Stack trace: ${error.stack}`);
      }
    } else if (error) {
      core.error(`${message}: ${JSON.stringify(error)}`);
    } else {
      core.error(message);
    }
  }

  startGroup(name: string): void {
    core.startGroup(name);
  }

  endGroup(): void {
    core.endGroup();
  }

  setSecret(secret: string): void {
    core.setSecret(secret);
  }

  logWithLevel(level: LogLevel, message: string, data?: any): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message, data);
        break;
      case LogLevel.INFO:
        this.info(message, data);
        break;
      case LogLevel.WARN:
        this.warn(message, data);
        break;
      case LogLevel.ERROR:
        this.error(message, data);
        break;
    }
  }
}
