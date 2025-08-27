export declare const CONSTANTS: {
    readonly COPILOT_USER_NAME: "copilot-swe-agent[bot]";
    readonly COPILOT_USER_EMAIL: "198982749+Copilot@users.noreply.github.com";
    readonly HOOKS_DISABLED_PATH: "/dev/null";
    readonly WINDOWS_HOOKS_DISABLED_PATH: "NUL";
    readonly HUSKY_ENV: "HUSKY";
    readonly GITHUB_TOKEN_ENV: "GITHUB_TOKEN";
    readonly GITHUB_REPOSITORY_ENV: "GITHUB_REPOSITORY";
    readonly STATE_POST_ENV: "STATE_isPost";
    readonly HUSKY_DIR: ".husky";
    readonly HUSKY_BACKUP_DIR: ".husky.backup";
    readonly PACKAGE_JSON: "package.json";
    readonly COMMITLINT_CONFIG_PATTERNS: readonly ["commitlint.config.js", "commitlint.config.ts", "commitlint.config.json", ".commitlintrc.js", ".commitlintrc.ts", ".commitlintrc.json", ".commitlintrc"];
    readonly BACKUP_DIR_PREFIX: ".copilot-backup";
    readonly BACKUP_MANIFEST_FILE: "manifest.json";
    readonly BACKUP_GIT_CONFIG_FILE: "git-config.json";
    readonly COMMON_HOOKS: readonly ["pre-commit", "commit-msg", "pre-push", "post-checkout", "post-commit", "post-merge", "pre-rebase"];
    readonly NOOP_HOOK_CONTENT: "#!/usr/bin/env sh\n# Disabled by Copilot Environment Action\nexit 0\n";
    readonly GIT_COMMAND_TIMEOUT: 30000;
    readonly FILE_OPERATION_TIMEOUT: 10000;
    readonly STATE_KEYS: {
        readonly CLEANUP_REQUIRED: "cleanup-required";
        readonly BACKUP_LOCATION: "backup-location";
        readonly ORIGINAL_CONFIGS: "original-configs";
    };
};
export declare const ERROR_MESSAGES: {
    readonly GITHUB_TOKEN_MISSING: "GitHub token not available in environment";
    readonly GITHUB_REPOSITORY_MISSING: "GitHub repository not available in environment";
    readonly BACKUP_CREATION_FAILED: "Failed to create configuration backup";
    readonly BACKUP_RESTORATION_FAILED: "Failed to restore original configuration";
    readonly GIT_CONFIG_FAILED: "Failed to configure git for Copilot agent";
    readonly HOOKS_DISABLE_FAILED: "Failed to disable git hooks";
    readonly HOOKS_RESTORE_FAILED: "Failed to restore git hooks";
    readonly ENVIRONMENT_VALIDATION_FAILED: "Environment validation failed";
    readonly UNKNOWN_OPERATION: "Unknown operation specified";
    readonly WORKING_DIRECTORY_INVALID: "Working directory does not exist or is not accessible";
};
