#!/bin/bash
set -e

# RunJS Security Scanning Script
# Runs multiple security scanners locally for development

echo "🔒 Running comprehensive security scan for RunJS..."

# Create reports directory
mkdir -p security-reports

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_tools=()
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if ! command -v trivy &> /dev/null; then
        missing_tools+=("trivy")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install missing tools and try again."
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Run npm audit
run_npm_audit() {
    print_status "Running npm audit..."
    
    if npm audit --audit-level=moderate --json > security-reports/npm-audit.json 2>/dev/null; then
        print_success "npm audit completed successfully"
    else
        print_warning "npm audit found vulnerabilities (check security-reports/npm-audit.json)"
    fi
    
    # Generate human-readable report
    npm audit --audit-level=moderate > security-reports/npm-audit.txt 2>/dev/null || true
}

# Run Trivy filesystem scan
run_trivy_fs() {
    print_status "Running Trivy filesystem scan..."
    
    trivy fs --config trivy.yaml \
        --format json \
        --output security-reports/trivy-fs.json \
        . || print_warning "Trivy filesystem scan found issues"
    
    # Generate table format for human reading
    trivy fs --config trivy.yaml \
        --format table \
        --output security-reports/trivy-fs.txt \
        . || true
    
    print_success "Trivy filesystem scan completed"
}

# Run Trivy secret scan
run_trivy_secrets() {
    print_status "Running Trivy secret detection..."
    
    trivy fs --scanners secret \
        --format json \
        --output security-reports/trivy-secrets.json \
        . || print_warning "Trivy found potential secrets"
    
    trivy fs --scanners secret \
        --format table \
        --output security-reports/trivy-secrets.txt \
        . || true
    
    print_success "Trivy secret scan completed"
}

# Run Docker image scan if Dockerfile exists
run_docker_scan() {
    if [ -f "Dockerfile" ] || [ -f "Dockerfile.security" ]; then
        print_status "Running Docker security scan..."
        
        # Use security-hardened Dockerfile if available
        local dockerfile="Dockerfile"
        if [ -f "Dockerfile.security" ]; then
            dockerfile="Dockerfile.security"
        fi
        
        # Build image for scanning
        docker build -f "$dockerfile" -t runjs:security-scan . > /dev/null 2>&1
        
        # Scan the built image
        trivy image --format json \
            --output security-reports/trivy-docker.json \
            runjs:security-scan || print_warning "Docker image scan found vulnerabilities"
        
        trivy image --format table \
            --output security-reports/trivy-docker.txt \
            runjs:security-scan || true
        
        # Clean up the test image
        docker rmi runjs:security-scan > /dev/null 2>&1 || true
        
        print_success "Docker security scan completed"
    else
        print_warning "No Dockerfile found, skipping Docker scan"
    fi
}

# Run Semgrep SAST if available
run_semgrep() {
    if command -v semgrep &> /dev/null; then
        print_status "Running Semgrep SAST scan..."
        
        semgrep --config=auto \
            --json \
            --output=security-reports/semgrep.json \
            . || print_warning "Semgrep found potential security issues"
        
        semgrep --config=auto \
            --output=security-reports/semgrep.txt \
            . || true
        
        print_success "Semgrep SAST scan completed"
    else
        print_warning "Semgrep not installed, skipping SAST scan"
        echo "Install with: pip install semgrep"
    fi
}

# Generate summary report
generate_summary() {
    print_status "Generating security summary..."
    
    local summary_file="security-reports/security-summary.md"
    
    cat > "$summary_file" << EOF
# Security Scan Summary

**Generated:** $(date)
**Project:** RunJS
**Scan Types:** npm audit, Trivy (filesystem & secrets), Docker, Semgrep SAST

## Scan Results

### NPM Audit
- Report: \`npm-audit.json\` and \`npm-audit.txt\`
- Status: $([ -f security-reports/npm-audit.json ] && echo "✅ Completed" || echo "❌ Failed")

### Trivy Filesystem Scan
- Report: \`trivy-fs.json\` and \`trivy-fs.txt\`
- Status: $([ -f security-reports/trivy-fs.json ] && echo "✅ Completed" || echo "❌ Failed")

### Trivy Secret Detection
- Report: \`trivy-secrets.json\` and \`trivy-secrets.txt\`
- Status: $([ -f security-reports/trivy-secrets.json ] && echo "✅ Completed" || echo "❌ Failed")

### Docker Security Scan
- Report: \`trivy-docker.json\` and \`trivy-docker.txt\`
- Status: $([ -f security-reports/trivy-docker.json ] && echo "✅ Completed" || echo "⏭️ Skipped")

### Semgrep SAST
- Report: \`semgrep.json\` and \`semgrep.txt\`
- Status: $([ -f security-reports/semgrep.json ] && echo "✅ Completed" || echo "⏭️ Skipped")

## Next Steps

1. Review all generated reports in the \`security-reports/\` directory
2. Address any HIGH or CRITICAL severity findings
3. Update dependencies with known vulnerabilities
4. Consider implementing additional security controls for any flagged issues

## Report Files

All scan results are saved in JSON format for automation and TXT format for human review.
EOF
    
    print_success "Security summary generated: $summary_file"
}

# Main execution
main() {
    echo "🚀 Starting RunJS security scan..."
    echo "==============================================="
    
    check_dependencies
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
    fi
    
    # Run all scans
    run_npm_audit
    run_trivy_fs
    run_trivy_secrets
    run_docker_scan
    run_semgrep
    
    # Generate summary
    generate_summary
    
    echo "==============================================="
    print_success "Security scan completed!"
    echo ""
    echo "📋 Summary report: security-reports/security-summary.md"
    echo "📁 All reports: security-reports/"
    echo ""
    echo "🔍 Review the reports and address any security findings."
}

# Run main function
main "$@"