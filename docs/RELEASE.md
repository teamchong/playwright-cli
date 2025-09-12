# Release Process

This project uses automated releases with [semantic-release](https://github.com/semantic-release/semantic-release).

## How It Works

Releases are triggered automatically when commits are pushed to the `main` or `master` branch that contain conventional commit messages indicating a release should be made.

## Conventional Commits

Use the following conventional commit format:

- `feat:` - New features (triggers minor version bump)
- `fix:` - Bug fixes (triggers patch version bump)  
- `docs:` - Documentation changes (no version bump)
- `refactor:` - Code refactoring (no version bump)
- `test:` - Test additions/changes (no version bump)
- `chore:` - Maintenance tasks (no version bump)

### Breaking Changes

To trigger a major version bump, add `BREAKING CHANGE:` to the commit body or add `!` after the type:

```
feat!: remove deprecated API
```

## Manual Release

To manually trigger a release, add `[release]` anywhere in your commit message:

```
docs: update README [release]
```

## Release Artifacts

Each release will:

1. Analyze commit messages since the last release
2. Generate a new version number based on semantic versioning
3. Update CHANGELOG.md with release notes
4. Create a GitHub release with release notes
5. Publish to npm (if configured)
6. Commit the version changes back to the repository

## Configuration

The release configuration is in `.releaserc.json`. It includes plugins for:

- Commit analysis
- Release notes generation  
- Changelog updates
- npm publishing
- GitHub releases
- Git commits for version changes