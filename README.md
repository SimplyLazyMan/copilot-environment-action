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
| `node-version` | Node.js version for dependencies | No | `latest` |
| `disable-hooks` | Whether to disable git hooks | No | `true` |
| `backup-configs` | Whether to backup original configurations | No | `true` |
| `debug` | Enable debug logging | No | `false` |
| `working-directory` | Working directory for the action | No | `.` |
| `auto-commit` | Whether to automatically commit changes after cleanup | No | `false` |
| `commit-message` | Commit message for auto-commit | No | `chore: revert copilot environment changes` |
| `auto-push` | Whether to automatically push committed changes | No | `false` |
| `target-branch` | Target branch for auto-commit and push | No | `main` |

## Outputs

| Output | Description |
|--------|-------------|
| `setup-successful` | Whether the setup was successful |
| `backup-location` | Location of configuration backups |
| `original-configs` | JSON string of original configurations |
| `hooks-disabled` | Whether hooks were successfully disabled |
| `environment-ready` | Whether the environment is ready for Copilot |
| `changes-committed` | Whether changes were successfully committed |
| `changes-pushed` | Whether changes were successfully pushed |

## What It Does

### Setup Phase

1. **Runtime Environment Setup**: Checks and installs Flutter and Node.js if required
2. **Environment Validation**: Checks git installation, GitHub environment, and working directory
3. **Configuration Backup**: Creates complete backup of `.husky/`, `package.json`, and git configuration
4. **Hook Disabling**: Disables git hooks at multiple levels (git config, husky, package.json)
5. **Git Configuration**: Sets up Copilot agent identity and authentication
6. **Dependency Setup**: Installs project dependencies with hooks disabled
7. **Final Validation**: Verifies environment is ready for Copilot operations

### Cleanup Phase

1. **Backup Loading**: Loads backup information from action state
2. **Git Restoration**: Restores original git configuration and user settings
3. **Hook Restoration**: Re-enables all git hooks and validation tools
4. **Configuration Restoration**: Restores all backed up files and configurations
5. **Auto-Commit**: Commits any remaining changes (if `auto-commit` is enabled)
6. **Auto-Push**: Pushes committed changes to repository (if `auto-push` is enabled)
7. **Cleanup**: Removes temporary files and clears action state
8. **Validation**: Verifies environment has been properly restored

## Automatic Runtime Setup

The action automatically detects your project type and sets up the required runtime environments:

### Flutter Projects

- Detects Flutter projects by checking for `pubspec.yaml`
- Verifies Flutter installation and version
- Automatically installs Flutter if missing or version mismatch
- Supports version specification via `flutter-version` input

### Node.js Projects

- Detects Node.js projects by checking for `package.json`
- Verifies Node.js installation and version
- Automatically installs Node.js if missing or version mismatch
- Supports version specification via `node-version` input

### Mixed Projects

- Handles projects that use both Flutter and Node.js
- Sets up both runtime environments as needed
- Ensures compatibility between versions

### Runtime Detection Examples

```yaml
# Flutter project - auto-detects and sets up Flutter
- name: Setup for Flutter Project
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    flutter-version: '3.35.1'
```

```yaml
# Node.js project - auto-detects and sets up Node.js
- name: Setup for Node.js Project
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    node-version: '20'
```

```yaml
# Mixed project - sets up both runtimes
- name: Setup for Mixed Project
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    flutter-version: '3.35.1'
    node-version: '20'
```

## Auto-Commit and Auto-Push Features

### Overview

The action can automatically commit and push changes made during the Copilot session to ensure that all changes are preserved and synchronized with the repository.

### Use Cases

- **CI/CD Integration**: Automatically commit changes made by Copilot during automated workflows
- **Change Preservation**: Ensure Copilot modifications aren't lost when the environment is cleaned up
- **Team Collaboration**: Push changes immediately for review by team members
- **Audit Trail**: Maintain a clear commit history of Copilot-generated changes

### Configuration Options

#### Auto-Commit Only

```yaml
- name: Auto-commit changes
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    auto-commit: 'true'
    commit-message: 'feat: automated improvements by GitHub Copilot'
```

#### Auto-Commit and Push

```yaml
- name: Auto-commit and push changes
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    auto-commit: 'true'
    auto-push: 'true'
    target-branch: 'copilot-changes'
    commit-message: 'chore: automated environment cleanup'
```

### Auto-Commit Security Considerations

- Ensure the `GITHUB_TOKEN` has appropriate write permissions
- Consider using branch protection rules for auto-pushed branches
- Review auto-committed changes before merging to main branches
- Use descriptive commit messages for audit purposes

### Outputs for Auto-Commit/Push

```yaml
- name: Check commit status
  if: steps.copilot-setup.outputs.changes-committed == 'true'
  run: echo "Changes were successfully committed"

- name: Check push status
  if: steps.copilot-setup.outputs.changes-pushed == 'true'
  run: echo "Changes were successfully pushed"
```

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

### Node.js Project with Auto-Commit and Push

```yaml
- name: Setup Copilot Environment with Auto-Commit
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'auto'
    node-version: '18'
    auto-commit: 'true'
    commit-message: 'feat: automated changes by GitHub Copilot'
    auto-push: 'true'
    target-branch: 'main'
    working-directory: './frontend'
```

### Auto-Commit Only (No Push)

```yaml
- name: Setup Copilot Environment with Auto-Commit Only
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'auto'
    auto-commit: 'true'
    commit-message: 'chore: copilot environment cleanup'
    auto-push: 'false'
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
