import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
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

export class RuntimeManager {
  constructor(
    private logger: Logger,
    private workingDirectory: string = '.'
  ) {}

  async checkRuntimes(): Promise<RuntimeInfo> {
    this.logger.startGroup('Checking runtime environments');

    const runtimeInfo: RuntimeInfo = {
      flutter: { installed: false },
      node: { installed: false },
      npm: { installed: false },
    };

    try {
      // Check Flutter
      await this.checkFlutter(runtimeInfo);

      // Check Node.js
      await this.checkNode(runtimeInfo);

      // Check npm
      await this.checkNpm(runtimeInfo);

      this.logger.info('Runtime check completed', runtimeInfo);
      return runtimeInfo;
    } catch (error) {
      this.logger.error('Runtime check failed', error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  async setupFlutter(requiredVersion: string): Promise<boolean> {
    this.logger.startGroup(`Setting up Flutter ${requiredVersion}`);

    try {
      // First check if Flutter is already installed with correct version
      const runtimeInfo = await this.checkRuntimes();

      if (runtimeInfo.flutter.installed && runtimeInfo.flutter.version) {
        const currentVersion = this.normalizeVersion(
          runtimeInfo.flutter.version
        );
        const targetVersion = this.normalizeVersion(requiredVersion);

        if (currentVersion === targetVersion || requiredVersion === 'latest') {
          this.logger.info(
            `Flutter ${runtimeInfo.flutter.version} already installed`
          );
          return true;
        }
      }

      // Install Flutter using the same approach as the composite action
      await this.installFlutter(requiredVersion);

      // Verify installation
      const verifyInfo = await this.checkRuntimes();
      if (!verifyInfo.flutter.installed) {
        throw new Error('Flutter installation verification failed');
      }

      this.logger.info(
        `Flutter ${verifyInfo.flutter.version} installed successfully`
      );
      return true;
    } catch (error) {
      this.logger.error('Flutter setup failed', error);
      return false;
    } finally {
      this.logger.endGroup();
    }
  }

  async setupNode(requiredVersion: string): Promise<boolean> {
    this.logger.startGroup(`Setting up Node.js ${requiredVersion}`);

    try {
      // Check if Node.js is already installed with correct version
      const runtimeInfo = await this.checkRuntimes();

      if (runtimeInfo.node.installed && runtimeInfo.node.version) {
        const currentMajor = this.extractMajorVersion(runtimeInfo.node.version);
        const targetMajor = this.extractMajorVersion(requiredVersion);

        if (currentMajor === targetMajor || requiredVersion === 'latest') {
          this.logger.info(
            `Node.js ${runtimeInfo.node.version} already installed`
          );
          return true;
        }
      }

      // Install Node.js
      await this.installNode(requiredVersion);

      // Verify installation
      const verifyInfo = await this.checkRuntimes();
      if (!verifyInfo.node.installed) {
        throw new Error('Node.js installation verification failed');
      }

      this.logger.info(
        `Node.js ${verifyInfo.node.version} installed successfully`
      );
      return true;
    } catch (error) {
      this.logger.error('Node.js setup failed', error);
      return false;
    } finally {
      this.logger.endGroup();
    }
  }

  private async checkFlutter(runtimeInfo: RuntimeInfo): Promise<void> {
    try {
      let output = '';
      const exitCode = await exec.exec('flutter', ['--version'], {
        cwd: this.workingDirectory,
        silent: true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
          stderr: (data: Buffer) => {
            output += data.toString();
          },
        },
      });

      if (exitCode === 0 && output.trim()) {
        runtimeInfo.flutter.installed = true;

        // Parse Flutter version from output
        const versionMatch = output.match(/Flutter\s+(\S+)/i);
        if (versionMatch) {
          runtimeInfo.flutter.version = versionMatch[1];
        }

        // Parse channel
        const channelMatch = output.match(/channel\s+(\S+)/i);
        if (channelMatch) {
          runtimeInfo.flutter.channel = channelMatch[1];
        }

        this.logger.debug(
          `Flutter found: ${runtimeInfo.flutter.version} (${runtimeInfo.flutter.channel})`
        );
      } else {
        this.logger.debug('Flutter not found or not accessible');
      }
    } catch (error) {
      this.logger.debug('Flutter check failed', error);
    }
  }

  private async checkNode(runtimeInfo: RuntimeInfo): Promise<void> {
    try {
      let output = '';
      const exitCode = await exec.exec('node', ['--version'], {
        cwd: this.workingDirectory,
        silent: true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      });

      if (exitCode === 0 && output.trim()) {
        runtimeInfo.node.installed = true;
        runtimeInfo.node.version = output.trim().replace('v', '');
        this.logger.debug(`Node.js found: ${runtimeInfo.node.version}`);
      } else {
        this.logger.debug('Node.js not found or not accessible');
      }
    } catch (error) {
      this.logger.debug('Node.js check failed', error);
    }
  }

  private async checkNpm(runtimeInfo: RuntimeInfo): Promise<void> {
    try {
      let output = '';
      const exitCode = await exec.exec('npm', ['--version'], {
        cwd: this.workingDirectory,
        silent: true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      });

      if (exitCode === 0 && output.trim()) {
        runtimeInfo.npm.installed = true;
        runtimeInfo.npm.version = output.trim();
        this.logger.debug(`npm found: ${runtimeInfo.npm.version}`);
      } else {
        this.logger.debug('npm not found or not accessible');
      }
    } catch (error) {
      this.logger.debug('npm check failed', error);
    }
  }

  private async installFlutter(version: string): Promise<void> {
    this.logger.info(`Installing Flutter ${version}`);

    try {
      // Use actions/setup-flutter or similar approach
      // For now, we'll use a simplified version that calls the Flutter install script

      const platform = process.platform;
      const isWindows = platform === 'win32';

      if (isWindows) {
        await this.installFlutterWindows(version);
      } else {
        await this.installFlutterUnix(version);
      }
    } catch (error) {
      this.logger.error('Flutter installation failed', error);
      throw error;
    }
  }

  private async installFlutterWindows(version: string): Promise<void> {
    // For Windows, we can use chocolatey or download directly
    this.logger.info('Installing Flutter on Windows');

    try {
      // Try chocolatey first
      await exec.exec(
        'choco',
        ['install', 'flutter', '--version', version, '-y'],
        {
          cwd: this.workingDirectory,
          ignoreReturnCode: true,
        }
      );
    } catch {
      this.logger.warn(
        'Chocolatey installation failed, trying direct download'
      );

      // Fallback: Use PowerShell to download and install Flutter
      const installScript = `
        $flutterVersion = "${version}"
        $flutterUrl = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_$flutterVersion-stable.zip"
        $flutterZip = "$env:TEMP\\flutter.zip"
        $flutterDir = "C:\\flutter"
        
        Write-Host "Downloading Flutter $flutterVersion..."
        Invoke-WebRequest -Uri $flutterUrl -OutFile $flutterZip
        
        Write-Host "Extracting Flutter..."
        Expand-Archive -Path $flutterZip -DestinationPath "C:\\" -Force
        
        Write-Host "Adding Flutter to PATH..."
        $env:PATH += ";$flutterDir\\bin"
        [Environment]::SetEnvironmentVariable("PATH", $env:PATH, [EnvironmentVariableTarget]::Machine)
        
        Write-Host "Flutter installation completed"
      `;

      await exec.exec('powershell', ['-Command', installScript], {
        cwd: this.workingDirectory,
      });
    }
  }

  private async installFlutterUnix(version: string): Promise<void> {
    // For Unix systems (Linux/macOS)
    this.logger.info('Installing Flutter on Unix system');

    const installScript = `
      set -e
      FLUTTER_VERSION="${version}"
      FLUTTER_DIR="$HOME/flutter"
      
      echo "Downloading Flutter $FLUTTER_VERSION..."
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_$FLUTTER_VERSION-stable.zip"
      else
        # Linux
        FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_$FLUTTER_VERSION-stable.tar.xz"
      fi
      
      cd $HOME
      curl -L -o flutter.archive "$FLUTTER_URL"
      
      if [[ "$OSTYPE" == "darwin"* ]]; then
        unzip -q flutter.archive
      else
        tar xf flutter.archive
      fi
      
      rm flutter.archive
      
      echo "Adding Flutter to PATH..."
      echo 'export PATH="$HOME/flutter/bin:$PATH"' >> $HOME/.bashrc
      export PATH="$HOME/flutter/bin:$PATH"
      
      echo "Flutter installation completed"
    `;

    await exec.exec('bash', ['-c', installScript], {
      cwd: this.workingDirectory,
    });
  }

  private async installNode(version: string): Promise<void> {
    this.logger.info(`Installing Node.js ${version}`);

    try {
      const platform = process.platform;
      const isWindows = platform === 'win32';

      if (isWindows) {
        await this.installNodeWindows(version);
      } else {
        await this.installNodeUnix(version);
      }
    } catch (error) {
      this.logger.error('Node.js installation failed', error);
      throw error;
    }
  }

  private async installNodeWindows(version: string): Promise<void> {
    // Use chocolatey or direct download for Windows
    try {
      // Try chocolatey first
      const chocoVersion = version === 'latest' ? '' : `--version ${version}`;
      await exec.exec('choco', ['install', 'nodejs', chocoVersion, '-y'], {
        cwd: this.workingDirectory,
        ignoreReturnCode: true,
      });
    } catch {
      this.logger.warn('Chocolatey Node.js installation failed');
      throw new Error('Node.js installation failed on Windows');
    }
  }

  private async installNodeUnix(version: string): Promise<void> {
    // Use NodeSource or NVM for Unix systems
    const installScript = `
      set -e
      NODE_VERSION="${version}"
      
      echo "Installing Node.js $NODE_VERSION..."
      
      # Use NodeSource repository
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use Homebrew if available
        if command -v brew >/dev/null 2>&1; then
          brew install node@$NODE_VERSION || brew install node
        else
          echo "Please install Homebrew or Node.js manually on macOS"
          exit 1
        fi
      else
        # Linux - use NodeSource
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
      fi
      
      echo "Node.js installation completed"
    `;

    await exec.exec('bash', ['-c', installScript], {
      cwd: this.workingDirectory,
    });
  }

  public normalizeVersion(version: string): string {
    // Remove 'v' prefix and normalize version string
    const result = version?.replace(/^v/, '')?.split('-')[0];
    return result || '';
  }

  public extractMajorVersion(version: string): string {
    // Extract major version number (e.g., "18.19.0" -> "18")
    const normalized = this.normalizeVersion(version);
    const result = normalized?.split('.')[0];
    return result || '';
  }

  async validateProjectType(): Promise<string> {
    const workingDir = this.workingDirectory;

    // Check for Flutter project
    const pubspecPath = path.join(workingDir, 'pubspec.yaml');
    const packageJsonPath = path.join(workingDir, 'package.json');

    const hasFlutter = fs.existsSync(pubspecPath);
    const hasNode = fs.existsSync(packageJsonPath);

    if (hasFlutter && hasNode) {
      return 'mixed';
    } else if (hasFlutter) {
      return 'flutter';
    } else if (hasNode) {
      return 'node';
    } else {
      return 'unknown';
    }
  }
}
