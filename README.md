# Copilot Environment Action

A GitHub Action that sets up and manages the development environment specifically for GitHub Copilot agents. This action handles environment setup, git hook management, and cleanup to ensure seamless Copilot operation while preserving developer workflows.

## Features

- 🔧 **Automatic Environment Setup**: Configures git, disables hooks, and prepares the environment for Copilot
- 🔐 **Secure Backup & Restore**: Creates complete backups of configurations and restores them after Copilot operations
- 🪝 **Hook Management**: Temporarily disables git hooks and linting tools without affecting normal developer workflows
- 🚀 **Multi-Project Support**: Works with Flutter, Node.js, and mixed projects
- 🛡️ **Error Recovery**: Automatic rollback on failures and comprehensive error handling
- 📋 **Comprehensive Logging**: Detailed logging with debug mode for troubleshooting

## Quick Start

### Basic Usage (Recommended)

```yaml
- name: Setup Copilot Environment
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'auto'
```

The `auto` operation automatically sets up the environment and schedules cleanup for the end of the job.

### Manual Setup and Cleanup

```yaml
- name: Setup Copilot Environment
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'setup'

# Your Copilot work happens here

- name: Cleanup Copilot Environment
  uses: SimplyLazyMan/copilot-environment-action@v1
  if: always()
  with:
    operation: 'cleanup'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `operation` | Operation to perform: `setup`, `cleanup`, or `auto` | No | `auto` |
| `flutter-version` | Flutter version to setup | No | `3.35.1` |
| `node-version` | Node.js version for dependencies | No | `20` |
| `disable-hooks` | Whether to disable git hooks | No | `true` |
| `backup-configs` | Whether to backup original configurations | No | `true` |
| `debug` | Enable debug logging | No | `false` |
| `working-directory` | Working directory for the action | No | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `setup-successful` | Whether the setup was successful |
| `backup-location` | Location of configuration backups |
| `original-configs` | JSON string of original configurations |
| `hooks-disabled` | Whether hooks were successfully disabled |
| `environment-ready` | Whether the environment is ready for Copilot |

## What It Does

### Setup Phase

1. **Environment Validation**: Checks git installation, GitHub environment, and working directory
2. **Configuration Backup**: Creates complete backup of `.husky/`, `package.json`, and git configuration
3. **Hook Disabling**: Disables git hooks at multiple levels (git config, husky, package.json)
4. **Git Configuration**: Sets up Copilot agent identity and authentication
5. **Dependency Setup**: Installs project dependencies with hooks disabled
6. **Final Validation**: Verifies environment is ready for Copilot operations

### Cleanup Phase

1. **Backup Loading**: Loads backup information from action state
2. **Git Restoration**: Restores original git configuration and user settings
3. **Hook Restoration**: Re-enables all git hooks and validation tools
4. **Configuration Restoration**: Restores all backed up files and configurations
5. **Cleanup**: Removes temporary files and clears action state
6. **Validation**: Verifies environment has been properly restored

## Examples

### Flutter Project

```yaml
name: Copilot Flutter Setup
on: workflow_dispatch

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Copilot Environment
        uses: SimplyLazyMan/copilot-environment-action@v1
        with:
          operation: 'auto'
          flutter-version: '3.35.1'
          debug: 'true'
```

### Node.js Project with Custom Configuration

```yaml
- name: Setup Copilot Environment
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'setup'
    node-version: '18'
    disable-hooks: 'true'
    backup-configs: 'true'
    working-directory: './frontend'
```

### Error Handling

```yaml
- name: Setup Copilot Environment
  id: copilot-setup
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'setup'
  continue-on-error: true

- name: Verify Setup
  if: steps.copilot-setup.outputs.setup-successful == 'true'
  run: echo "Environment ready for Copilot"

- name: Manual Cleanup on Failure
  if: failure()
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'cleanup'
```

## Supported Environments

- **Operating Systems**: Linux, macOS, Windows
- **Package Managers**: npm, yarn, pnpm
- **Project Types**: Flutter, Node.js, Mixed projects
- **Git Hooks**: Husky, custom hooks, commitlint, lint-staged

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the GitHub token has appropriate permissions
2. **Hook Restoration Fails**: Check if `.husky.backup` directory exists
3. **Git Authentication Issues**: Verify `GITHUB_TOKEN` is available

### Debug Mode

Enable debug mode for detailed logging:

```yaml
- name: Setup Copilot Environment
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    debug: 'true'
```

### Emergency Cleanup

If the action fails and leaves the environment in an inconsistent state, you can perform emergency cleanup:

```yaml
- name: Emergency Cleanup
  if: failure()
  run: |
    git config --unset core.hooksPath || true
    git config --global --unset core.hooksPath || true
    # Restore hooks if backup exists
    if [ -d ".husky.backup" ]; then
      rm -rf .husky
      mv .husky.backup .husky
    fi
```

## Security Considerations

- The action handles GitHub tokens securely and masks them in logs
- Backups are created in temporary directories and cleaned up after use
- No sensitive information is persisted beyond the action execution
- All modifications are reversible through the backup system

## Development

### Building

```bash
pnpm install
pnpm run build
```

### Testing

```bash
pnpm test
pnpm run test:coverage
```

### Linting

```bash
pnpm run lint
pnpm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass and linting is clean
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

- Create an issue in this repository
- Check the troubleshooting section above
- Enable debug mode for detailed logging
