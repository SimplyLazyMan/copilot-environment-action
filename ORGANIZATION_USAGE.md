# 🚀 Copilot Environment Action - Organization Template

This template shows how to use the Copilot Environment Action in your organization's repositories.

## 📋 **Quick Start Templates**

### **Auto Mode (Recommended)**

```yaml
name: 'Copilot Auto Environment'
on:
  workflow_dispatch:
  pull_request:
    types: [opened, synchronize]

jobs:
  copilot-work:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      actions: read
      pull-requests: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ github.token }}
          
      - name: Setup Copilot Environment
        uses: SimplyLazyMan/copilot-environment-action@v1
        with:
          operation: 'auto'
          working-directory: '.'
          debug: 'true'
        env:
          GITHUB_TOKEN: ${{ github.token }}
          
      # Your Copilot agent work goes here
      - name: Run Copilot Analysis
        run: |
          echo "🤖 Running Copilot analysis..."
          # Copilot can now commit without hook interference
          # Add your specific Copilot commands here
          
      # Action automatically cleans up via post-action
```

### **Manual Mode with Setup/Cleanup**

```yaml
name: 'Copilot Manual Environment'
on:
  workflow_dispatch:

jobs:
  copilot-manual:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      actions: read
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Copilot Environment
        id: setup
        uses: SimplyLazyMan/copilot-environment-action@v1
        with:
          operation: 'setup'
          flutter-version: '3.24.3'
          node-version: '20'
          working-directory: './my-project'
          debug: 'true'
        env:
          GITHUB_TOKEN: ${{ github.token }}
          
      - name: Verify Setup
        run: |
          echo "Setup successful: ${{ steps.setup.outputs.setup-successful }}"
          echo "Environment ready: ${{ steps.setup.outputs.environment-ready }}"
          echo "Hooks disabled: ${{ steps.setup.outputs.hooks-disabled }}"
          
      # Your Copilot work here
      - name: Run Copilot Tasks
        run: |
          cd my-project
          echo "🤖 Copilot working..."
          # Your Copilot commands
          
      - name: Cleanup Environment
        uses: SimplyLazyMan/copilot-environment-action@v1
        if: always()
        with:
          operation: 'cleanup'
          working-directory: './my-project'
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

### **Multi-Project Repository**

```yaml
name: 'Multi-Project Copilot'
on:
  workflow_dispatch:

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Frontend Environment
        uses: SimplyLazyMan/copilot-environment-action@v1
        with:
          operation: 'auto'
          node-version: '20'
          working-directory: './frontend'
        env:
          GITHUB_TOKEN: ${{ github.token }}
      # Frontend Copilot work

  backend:
    runs-on: ubuntu-latest  
    steps:
      - uses: actions/checkout@v4
      - name: Setup Backend Environment
        uses: SimplyLazyMan/copilot-environment-action@v1
        with:
          operation: 'auto'
          working-directory: './backend'
        env:
          GITHUB_TOKEN: ${{ github.token }}
      # Backend Copilot work

  flutter-app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Flutter Environment
        uses: SimplyLazyMan/copilot-environment-action@v1
        with:
          operation: 'auto'
          flutter-version: '3.24.3'
          working-directory: './mobile'
        env:
          GITHUB_TOKEN: ${{ github.token }}
      # Flutter Copilot work
```

## ⚙️ **Configuration Options**

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `operation` | Operation: `auto`, `setup`, `cleanup` | `auto` | No |
| `flutter-version` | Flutter version to setup | `3.24.3` | No |
| `node-version` | Node.js version | `20` | No |
| `disable-hooks` | Disable git hooks | `true` | No |
| `backup-configs` | Backup original configs | `true` | No |
| `debug` | Enable debug logging | `false` | No |
| `working-directory` | Working directory | `.` | No |

## 📤 **Output Variables**

| Output | Description | Example |
|--------|-------------|---------|
| `setup-successful` | Setup success status | `true` |
| `environment-ready` | Environment ready status | `true` |
| `hooks-disabled` | Hooks disabled status | `true` |
| `backup-location` | Backup file location | `.copilot-backup/` |
| `original-configs` | Original configs (JSON) | `{...}` |

## 🔐 **Required Permissions**

```yaml
permissions:
  contents: write      # For git operations
  actions: read       # For action access
  pull-requests: write # If working with PRs (optional)
```

## 🌍 **Environment Variables**

```yaml
env:
  GITHUB_TOKEN: ${{ github.token }}  # Required for git operations
```

## 📚 **Usage Examples by Project Type**

### **Node.js/TypeScript Projects**

```yaml
- name: Setup for Node.js Project
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'auto'
    node-version: '20'
    working-directory: './nodejs-app'
```

### **Flutter Projects**

```yaml
- name: Setup for Flutter Project
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'auto'
    flutter-version: '3.24.3'
    working-directory: './flutter-app'
```

### **Monorepo Projects**

```yaml
- name: Setup for Specific Package
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'auto'
    working-directory: './packages/my-package'
```

## 🚨 **Common Issues & Solutions**

### **Permission Denied**

```yaml
# Ensure GITHUB_TOKEN is provided
env:
  GITHUB_TOKEN: ${{ github.token }}
```

### **Git Remote Not Found**

```yaml
# Ensure checkout includes token
- uses: actions/checkout@v4
  with:
    token: ${{ github.token }}
    fetch-depth: 0
```

### **Hooks Not Restored**

```yaml
# Always run cleanup, even on failure
- name: Cleanup
  uses: SimplyLazyMan/copilot-environment-action@v1
  if: always()
  with:
    operation: 'cleanup'
```

## 🔄 **Migration from Manual Scripts**

### **Before (Manual)**

```yaml
- name: Manual Setup
  run: |
    # Backup hooks
    cp -r .husky .husky.backup || true
    cp .gitignore .gitignore.backup || true
    
    # Disable hooks
    git config core.hooksPath /dev/null
    
    # Your work...
    
    # Restore (manual cleanup)
    git config --unset core.hooksPath || true
    cp -r .husky.backup .husky || true
    rm -rf .husky.backup .gitignore.backup
```

### **After (Using Action)**

```yaml
- name: Auto Setup & Cleanup
  uses: SimplyLazyMan/copilot-environment-action@v1
  with:
    operation: 'auto'
```

## 📋 **Best Practices**

1. **Use Auto Mode**: Simplest and most reliable
2. **Set Debug**: Use `debug: 'true'` for troubleshooting
3. **Specify Directories**: Use `working-directory` for multi-project repos
4. **Handle Failures**: Use `if: always()` for cleanup steps
5. **Version Pinning**: Use specific versions like `@v1.0.0` for stability

## 🆘 **Troubleshooting**

### **Check Action Logs**

Enable debug mode to see detailed logs:

```yaml
with:
  debug: 'true'
```

### **Verify Permissions**

Ensure your workflow has the required permissions:

```yaml
permissions:
  contents: write
  actions: read
```

### **Test Locally**

Before deploying, test the action in your repository's workflow.

## 📞 **Support**

- **Issues**: Report at `SimplyLazyMan/copilot-environment-action/issues`
- **Documentation**: See the main repository README
- **Updates**: Watch the repository for new releases
