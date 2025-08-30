import { parseInputs } from '../src/main';

// Mock GitHub environment variables
process.env.GITHUB_REF = 'refs/heads/feature-branch';

// Mock @actions/core
jest.mock('@actions/core', () => ({
  getInput: jest.fn((name: string) => {
    const inputs: Record<string, string> = {
      operation: 'auto',
      'flutter-version': '',
      'node-version': '',
      'working-directory': '',
      'commit-message': '',
      'target-branch': '', // Empty to test automatic detection
    };
    return inputs[name] || '';
  }),
  getBooleanInput: jest.fn(() => false),
}));

describe('Dynamic Branch Detection', () => {
  test('should detect current branch from GITHUB_REF', () => {
    const inputs = parseInputs();
    expect(inputs.targetBranch).toBe('feature-branch');
  });

  test('should use GITHUB_HEAD_REF for pull requests', () => {
    // Simulate pull request context
    process.env.GITHUB_REF = 'refs/pull/123/merge';
    process.env.GITHUB_HEAD_REF = 'pr-source-branch';

    const inputs = parseInputs();
    expect(inputs.targetBranch).toBe('pr-source-branch');

    // Cleanup
    delete process.env.GITHUB_HEAD_REF;
  });

  test('should fallback to main when branch detection fails', () => {
    // Clear environment variables
    delete process.env.GITHUB_REF;
    delete process.env.GITHUB_HEAD_REF;

    const inputs = parseInputs();
    expect(inputs.targetBranch).toBe('main');

    // Restore
    process.env.GITHUB_REF = 'refs/heads/feature-branch';
  });
});
