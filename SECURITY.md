# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in RunJS, please report it responsibly:

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email security@runjs.dev with details
3. Include steps to reproduce, impact assessment, and suggested fixes if possible

## Security Features

### 🔒 Code Execution Security

- **Dangerous Pattern Detection**: Blocks file system operations, process manipulation, and eval usage
- **Package Whitelist**: Only allows pre-approved safe npm packages
- **Code Complexity Analysis**: Limits cyclomatic complexity and nested loops
- **Execution Timeouts**: 10-second maximum execution time
- **Memory Limits**: 50MB maximum memory usage per execution
- **Suspicious Content Detection**: Identifies potential mining, DoS, and malicious patterns

### 🛡️ API Security

- **API Key Authentication**: Required for all execute endpoints in production
- **Rate Limiting**: 60 requests/minute per IP, 1000/hour per API key
- **Input Validation**: Strict validation of all request parameters
- **Request Logging**: Comprehensive security event logging

### 🔐 Infrastructure Security

- **Security Headers**: 11 comprehensive HTTP security headers including CSP
- **Docker Hardening**: Non-root user, minimal attack surface, health checks
- **Network Isolation**: Restricted network access for executed code
- **Environment Sanitization**: No sensitive environment variables exposed

### 📊 Monitoring & Alerting

- **Security Event Logging**: All security violations logged with severity levels
- **Metrics Dashboard**: Real-time security metrics and suspicious IP tracking
- **Health Monitoring**: Application health checks with memory usage tracking

## Security Configuration

### Environment Variables

```bash
# API Keys (production)
API_KEY_1=rjs_your_secure_api_key_here
API_KEY_2=rjs_another_secure_key_here

# Security Webhook (optional)
SECURITY_WEBHOOK_URL=https://your-siem-system.com/webhook

# Node.js Security
NODE_OPTIONS="--max-old-space-size=256 --max-http-header-size=8192"
```

### Rate Limiting

- **Global**: 1000 requests/minute
- **Per IP**: 60 requests/minute
- **Per API Key**: 1000 requests/hour

### Code Execution Limits

- **Timeout**: 10 seconds
- **Memory**: 50MB
- **Code Size**: 50KB maximum
- **Complexity**: Max cyclomatic complexity of 100
- **Nested Loops**: Maximum 3 levels deep

## Security Testing

Run the security test suite:

```bash
npm run test:all -- tests/security.spec.ts
```

Security tests cover:

- Dangerous code pattern detection
- Package whitelist enforcement
- API authentication
- Rate limiting
- Code complexity analysis
- Suspicious content detection
- Security monitoring endpoints

## Security Updates

- Dependencies are automatically scanned for vulnerabilities
- Security patches are applied within 48 hours of disclosure
- All security events are logged and monitored
- Regular security audits are performed quarterly

## Compliance

This application implements security controls following:

- OWASP Application Security Verification Standard (ASVS)
- NIST Cybersecurity Framework
- ISO 27001 security management principles

Last updated: January 2025
