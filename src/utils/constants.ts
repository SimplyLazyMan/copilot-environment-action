export const CONSTANTS = {
  // Git configuration
  COPILOT_USER_NAME: 'copilot-swe-agent[bot]',
  COPILOT_USER_EMAIL: '198982749+Copilot@users.noreply.github.com',
  HOOKS_DISABLED_PATH: '/dev/null',
  WINDOWS_HOOKS_DISABLED_PATH: 'NUL',

  // Environment variables
  HUSKY_ENV: 'HUSKY',
  GITHUB_TOKEN_ENV: 'GITHUB_TOKEN',
  GITHUB_REPOSITORY_ENV: 'GITHUB_REPOSITORY',
  STATE_POST_ENV: 'STATE_isPost',

  // File paths
  HUSKY_DIR: '.husky',
  HUSKY_BACKUP_DIR: '.husky.backup',
  PACKAGE_JSON: 'package.json',
  COMMITLINT_CONFIG_PATTERNS: [
    'commitlint.config.js',
    'commitlint.config.ts',
    'commitlint.config.json',
    '.commitlintrc.js',
    '.commitlintrc.ts',
    '.commitlintrc.json',
    '.commitlintrc',
  ],

  // Backup
  BACKUP_DIR_PREFIX: '.copilot-backup',
  BACKUP_MANIFEST_FILE: 'manifest.json',
  BACKUP_GIT_CONFIG_FILE: 'git-config.json',

  // Common hooks
  COMMON_HOOKS: [
    'pre-commit',
    'commit-msg',
    'pre-push',
    'post-checkout',
    'post-commit',
    'post-merge',
    'pre-rebase',
  ],

  // No-op hook content
  NOOP_HOOK_CONTENT: `#!/usr/bin/env sh
# Disabled by Copilot Environment Action
exit 0
`,

  // Timeouts
  GIT_COMMAND_TIMEOUT: 30000, // 30 seconds
  FILE_OPERATION_TIMEOUT: 10000, // 10 seconds

  // Action state keys
  STATE_KEYS: {
    CLEANUP_REQUIRED: 'cleanup-required',
    BACKUP_LOCATION: 'backup-location',
    ORIGINAL_CONFIGS: 'original-configs',
  },
} as const;

export const ERROR_MESSAGES = {
  GITHUB_TOKEN_MISSING: 'GitHub token not available in environment',
  GITHUB_REPOSITORY_MISSING: 'GitHub repository not available in environment',
  BACKUP_CREATION_FAILED: 'Failed to create configuration backup',
  BACKUP_RESTORATION_FAILED: 'Failed to restore original configuration',
  GIT_CONFIG_FAILED: 'Failed to configure git for Copilot agent',
  HOOKS_DISABLE_FAILED: 'Failed to disable git hooks',
  HOOKS_RESTORE_FAILED: 'Failed to restore git hooks',
  ENVIRONMENT_VALIDATION_FAILED: 'Environment validation failed',
  UNKNOWN_OPERATION: 'Unknown operation specified',
  WORKING_DIRECTORY_INVALID:
    'Working directory does not exist or is not accessible',
} as const;
