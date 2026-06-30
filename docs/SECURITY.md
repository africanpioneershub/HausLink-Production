# Security

## Secret Scanning

This repo uses [gitleaks](https://github.com/gitleaks/gitleaks) to prevent committing secrets. A pre-commit hook scans staged files automatically once gitleaks is installed locally.

**Install gitleaks:**

```bash
# macOS
brew install gitleaks

# Windows
choco install gitleaks

# Or download from:
# https://github.com/gitleaks/gitleaks/releases
```

The hook is non-blocking if gitleaks is not installed — it will warn but not abort the commit. Once installed, it will block commits containing secrets.

To run a manual scan of the full repo:

```bash
gitleaks detect -v
```

## Reporting Security Issues

If you discover a security vulnerability, please report it to: **afriprimeholdings@gmail.com**

Do not open a public GitHub issue for security vulnerabilities.
