# Security Policy and Scanning Guide

## Overview

RunJS implements comprehensive security scanning and defensive measures to protect against malicious code execution and security vulnerabilities. This document outlines our security scanning tools, policies, and procedures.

## 🔒 Security Scanners Implemented

### 1. Trivy Security Scanner

**Purpose**: Vulnerability scanning for dependencies, container images, and secret detection.

**Configuration**: `trivy.yaml`, `.trivyignore`, `.trivysecret.yaml`

**Usage**:
```bash
# Full security scan
npm run security:scan

# Vulnerability scan only
npm run security:trivy

# Secret detection only
npm run security:secrets

# Docker image scan
npm run security:docker
```

**What it scans**:
- Dependencies for known CVEs
- Container images for vulnerabilities
- Source code for secrets and credentials
- Configuration files for security issues

### 2. NPM Audit

**Purpose**: Node.js dependency vulnerability scanning.

**Usage**:
```bash
# Audit dependencies
npm run security:audit

# Fix vulnerabilities automatically
npm run security:fix
```

**Features**:
- Identifies vulnerable dependencies
- Provides severity ratings
- Suggests fixes and updates

### 3. CodeQL (GitHub Actions)

**Purpose**: Semantic code analysis for security vulnerabilities.

**Configuration**: `.github/workflows/security-scan.yml`

**Features**:
- Detects SQL injection, XSS, and other OWASP Top 10 issues
- Semantic analysis beyond pattern matching
- Integrated with GitHub Security tab

### 4. Semgrep SAST

**Purpose**: Static Application Security Testing with custom rules.

**Configuration**: `.semgrepignore`

**Usage**:
```bash
# If Semgrep is installed
semgrep --config=auto .
```

**Features**:
- Language-specific security rules
- Custom rule support
- Low false-positive rate

### 5. Docker Security Scanning

**Purpose**: Container image security analysis.

**Configuration**: `Dockerfile.security`

**Features**:
- Multi-stage security-hardened builds
- Non-root user execution
- Minimal attack surface
- Security updates integration

## 🚀 Running Security Scans

### Local Development

1. **Quick Security Check**:
   ```bash
   npm run security:audit
   ```

2. **Comprehensive Local Scan**:
   ```bash
   npm run security:scan
   ```

3. **Docker Security Scan**:
   ```bash
   npm run security:docker
   ```

### CI/CD Pipeline

Security scans run automatically on:
- Every push to `main` and `develop` branches
- All pull requests
- Daily scheduled scans at 2 AM UTC

### Manual Execution

Use the security scanning script directly:
```bash
./scripts/security-scan.sh
```

## 📊 Understanding Scan Results

### Severity Levels

- **CRITICAL**: Immediate action required
- **HIGH**: Should be fixed in next release
- **MEDIUM**: Should be planned for future release
- **LOW**: Consider fixing when convenient

### Report Locations

- **Local scans**: `security-reports/` directory
- **CI/CD scans**: GitHub Security tab and workflow artifacts
- **Summary reports**: Generated in Markdown format

## 🛡️ Security Policies

### Dependency Management

1. **Regular Updates**: Dependencies are scanned daily
2. **Vulnerability Response**: HIGH/CRITICAL vulnerabilities must be addressed within 48 hours
3. **Dependency Approval**: New dependencies must pass security scan

### Code Security

1. **Secret Detection**: No secrets in source code
2. **Input Validation**: All user input must be validated
3. **Secure Defaults**: Fail-secure by default
4. **Least Privilege**: Minimal permissions and access

### Container Security

1. **Non-root Execution**: Containers run as non-root user
2. **Minimal Base Images**: Use Alpine or distroless images
3. **Security Updates**: Base images updated regularly
4. **Read-only Filesystem**: Where possible

## 🔧 Configuration Files

### Security Scanning Configuration

- `trivy.yaml`: Main Trivy configuration
- `.trivyignore`: Vulnerabilities to ignore (with justification)
- `.trivysecret.yaml`: Secret detection patterns
- `.semgrepignore`: Files to exclude from SAST
- `.dockerignore`: Docker build exclusions

### GitHub Actions

- `.github/workflows/security-scan.yml`: Automated security pipeline

### Scripts

- `scripts/security-scan.sh`: Local comprehensive security scan

## 🚨 Incident Response

### If Vulnerabilities Are Found

1. **Assessment**: Evaluate severity and impact
2. **Prioritization**: HIGH/CRITICAL issues first
3. **Remediation**: Apply fixes or mitigations
4. **Verification**: Re-scan to confirm fix
5. **Documentation**: Update security reports

### Secret Detection Response

1. **Immediate**: Revoke compromised credentials
2. **Investigation**: Determine scope of exposure
3. **Rotation**: Generate new credentials
4. **Monitoring**: Watch for unauthorized access

## 📝 Security Checklist

### Before Deployment

- [ ] All security scans pass
- [ ] No HIGH/CRITICAL vulnerabilities
- [ ] Dependencies up to date
- [ ] No secrets in code
- [ ] Docker security scan clean

### Regular Maintenance

- [ ] Weekly dependency updates
- [ ] Monthly security scan review
- [ ] Quarterly policy review
- [ ] Annual penetration testing

## 🛠️ Tool Installation

### Prerequisites

```bash
# Install Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -

# Install Semgrep (optional)
pip install semgrep

# Docker (for container scanning)
# Follow Docker installation guide for your platform
```

### Verification

```bash
# Check tool versions
trivy version
npm --version
docker --version
semgrep --version  # if installed
```

## 📚 Additional Resources

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [GitHub CodeQL](https://codeql.github.com/)
- [Semgrep Documentation](https://semgrep.dev/docs/)
- [OWASP Top 10](https://owasp.org/Top10/)

## 🤝 Contributing to Security

### Reporting Security Issues

Please report security vulnerabilities to: security@runjs.dev

### Security Improvements

1. Fork the repository
2. Create a security-focused branch
3. Implement improvements
4. Ensure all security scans pass
5. Submit a pull request with security impact description

---

**Last Updated**: December 2024
**Version**: 1.0.0