#!/usr/bin/env node
/**
 * Security Audit Script for Zariya FMC Platform
 * 
 * This script performs various security checks and generates a report
 * Run with: node scripts/security-audit.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

class SecurityAudit {
  constructor() {
    this.findings = [];
    this.severityLevels = {
      CRITICAL: 'CRITICAL',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
      INFO: 'INFO'
    };
  }

  addFinding(severity, category, issue, file = null, recommendation = null) {
    this.findings.push({
      severity,
      category,
      issue,
      file,
      recommendation,
      timestamp: new Date().toISOString()
    });
  }

  // Check for hardcoded secrets and credentials
  checkHardcodedSecrets() {
    console.log('🔍 Checking for hardcoded secrets...');
    
    const secretPatterns = [
      { pattern: /password\s*[=:]\s*['""][^'""]+['""]/, name: 'Password' },
      { pattern: /api[_-]?key\s*[=:]\s*['""][^'""]+['""]/, name: 'API Key' },
      { pattern: /secret[_-]?key\s*[=:]\s*['""][^'""]+['""]/, name: 'Secret Key' },
      { pattern: /private[_-]?key\s*[=:]\s*['""][^'""]+['""]/, name: 'Private Key' },
      { pattern: /token\s*[=:]\s*['""][^'""]+['""]/, name: 'Token' },
      { pattern: /sk_live_[a-zA-Z0-9]{24,}/, name: 'Stripe Live Key' },
      { pattern: /pk_live_[a-zA-Z0-9]{24,}/, name: 'Stripe Live Publishable Key' },
      { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
    ];

    const filesToCheck = this.getSourceFiles();
    
    filesToCheck.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        secretPatterns.forEach(({ pattern, name }) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addFinding(
              this.severityLevels.CRITICAL,
              'Hardcoded Secrets',
              `Potential ${name} found in source code`,
              file,
              'Move secrets to environment variables and add file to .gitignore'
            );
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    });
  }

  // Check environment configuration
  checkEnvironmentConfig() {
    console.log('🔧 Checking environment configuration...');
    
    const envPath = path.join(projectRoot, '.env');
    const envExamplePath = path.join(projectRoot, 'env.example');
    
    if (!fs.existsSync(envPath)) {
      this.addFinding(
        this.severityLevels.HIGH,
        'Environment Configuration',
        '.env file not found',
        null,
        'Create .env file with required environment variables'
      );
    }

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check for development values in production
      const devPatterns = [
        { pattern: /NODE_ENV=development/, name: 'Development environment' },
        { pattern: /localhost/, name: 'Localhost URLs' },
        { pattern: /127\.0\.0\.1/, name: 'Localhost IPs' },
        { pattern: /test.*password/, name: 'Test passwords' },
      ];

      devPatterns.forEach(({ pattern, name }) => {
        if (pattern.test(envContent)) {
          this.addFinding(
            this.severityLevels.MEDIUM,
            'Environment Configuration',
            `${name} found in .env file`,
            '.env',
            'Ensure production values are used in production environment'
          );
        }
      });

      // Check for empty or default values
      const emptyOrDefaultPatterns = [
        'JWT_SECRET=your-super-secret-jwt-key',
        'AWS_ACCESS_KEY_ID=',
        'SENDGRID_API_KEY=',
        'TWILIO_ACCOUNT_SID=',
      ];

      emptyOrDefaultPatterns.forEach(pattern => {
        if (envContent.includes(pattern)) {
          this.addFinding(
            this.severityLevels.HIGH,
            'Environment Configuration',
            `Empty or default value: ${pattern}`,
            '.env',
            'Set proper production values for all environment variables'
          );
        }
      });
    }
  }

  // Check dependencies for known vulnerabilities
  checkDependencies() {
    console.log('📦 Checking dependencies...');
    
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Known vulnerable patterns (this would typically integrate with npm audit)
      const vulnerablePackages = [
        { name: 'lodash', versions: ['<4.17.21'], issue: 'Prototype pollution' },
        { name: 'express', versions: ['<4.18.0'], issue: 'Various vulnerabilities' },
        { name: 'jsonwebtoken', versions: ['<9.0.0'], issue: 'Algorithm confusion' },
      ];

      vulnerablePackages.forEach(({ name, versions, issue }) => {
        if (dependencies[name]) {
          this.addFinding(
            this.severityLevels.MEDIUM,
            'Dependencies',
            `Potentially vulnerable package: ${name} - ${issue}`,
            'package.json',
            `Update ${name} to latest stable version and run npm audit`
          );
        }
      });
    }
  }

  // Check file permissions and sensitive files
  checkFilePermissions() {
    console.log('📁 Checking file permissions and sensitive files...');
    
    const sensitiveFiles = [
      '.env',
      'private.key',
      'server.key',
      'database.sqlite',
      'id_rsa',
      'id_dsa',
    ];

    sensitiveFiles.forEach(file => {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const mode = (stats.mode & parseInt('777', 8)).toString(8);
          
          if (mode !== '600' && mode !== '400') {
            this.addFinding(
              this.severityLevels.HIGH,
              'File Permissions',
              `Sensitive file ${file} has insecure permissions: ${mode}`,
              file,
              'Set restrictive permissions (600 or 400) for sensitive files'
            );
          }
        } catch (error) {
          // Skip if we can't read permissions
        }
      }
    });

    // Check for backup files and temp files
    const dangerousFiles = this.findDangerousFiles();
    dangerousFiles.forEach(file => {
      this.addFinding(
        this.severityLevels.MEDIUM,
        'File Security',
        `Potentially dangerous file found: ${file}`,
        file,
        'Remove backup files, temporary files, and other sensitive artifacts'
      );
    });
  }

  // Check security headers configuration
  checkSecurityHeaders() {
    console.log('🛡️  Checking security headers configuration...');
    
    const securityMiddlewarePath = path.join(projectRoot, 'server/middleware/security.ts');
    if (fs.existsSync(securityMiddlewarePath)) {
      const content = fs.readFileSync(securityMiddlewarePath, 'utf8');
      
      const requiredHeaders = [
        'helmet',
        'contentSecurityPolicy',
        'hsts',
        'crossOriginEmbedderPolicy'
      ];

      requiredHeaders.forEach(header => {
        if (!content.includes(header)) {
          this.addFinding(
            this.severityLevels.MEDIUM,
            'Security Headers',
            `Missing security header configuration: ${header}`,
            'server/middleware/security.ts',
            'Implement comprehensive security headers using helmet.js'
          );
        }
      });

      // Check for unsafe CSP directives
      if (content.includes("'unsafe-eval'") && !content.includes('dev')) {
        this.addFinding(
          this.severityLevels.HIGH,
          'Security Headers',
          'Unsafe CSP directive found: unsafe-eval',
          'server/middleware/security.ts',
          'Remove unsafe-eval from CSP in production environment'
        );
      }
    } else {
      this.addFinding(
        this.severityLevels.HIGH,
        'Security Headers',
        'Security middleware not found',
        null,
        'Implement security middleware with proper headers'
      );
    }
  }

  // Check for SQL injection vulnerabilities
  checkSQLInjection() {
    console.log('🗃️  Checking for SQL injection vulnerabilities...');
    
    const sqlFiles = this.getSourceFiles().filter(file => 
      file.includes('db') || file.includes('query') || file.includes('model')
    );

    const dangerousPatterns = [
      /query\s*\(\s*[`"'].*\$\{.*\}.*[`"']/g, // Template literals with variables
      /query\s*\(\s*.*\+.*\)/g, // String concatenation
      /SELECT.*\$\{/g, // Direct variable insertion
      /INSERT.*\$\{/g,
      /UPDATE.*\$\{/g,
      /DELETE.*\$\{/g,
    ];

    sqlFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        dangerousPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            this.addFinding(
              this.severityLevels.HIGH,
              'SQL Injection',
              'Potentially unsafe SQL query construction',
              file,
              'Use parameterized queries or ORM methods to prevent SQL injection'
            );
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    });
  }

  // Check authentication and authorization
  checkAuth() {
    console.log('🔐 Checking authentication and authorization...');
    
    const authFiles = this.getSourceFiles().filter(file => 
      file.includes('auth') || file.includes('middleware')
    );

    authFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for weak password requirements
        if (content.includes('password') && !content.includes('bcrypt') && !content.includes('hash')) {
          this.addFinding(
            this.severityLevels.HIGH,
            'Authentication',
            'Password handling without proper hashing detected',
            file,
            'Use bcrypt or similar library for password hashing'
          );
        }

        // Check for missing rate limiting
        if (content.includes('/api/login') && !content.includes('rateLimit')) {
          this.addFinding(
            this.severityLevels.MEDIUM,
            'Authentication',
            'Login endpoint without rate limiting',
            file,
            'Implement rate limiting for authentication endpoints'
          );
        }
      } catch (error) {
        // Skip files that can't be read
      }
    });
  }

  // Check HTTPS and TLS configuration
  checkHTTPS() {
    console.log('🔒 Checking HTTPS and TLS configuration...');
    
    const serverFiles = this.getSourceFiles().filter(file => 
      file.includes('server') || file.includes('index.ts')
    );

    let httpsFound = false;
    serverFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('https') || content.includes('createSecureServer')) {
          httpsFound = true;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    });

    if (!httpsFound) {
      this.addFinding(
        this.severityLevels.HIGH,
        'HTTPS/TLS',
        'No HTTPS configuration found',
        null,
        'Configure HTTPS/TLS for production deployment'
      );
    }
  }

  // Utility methods
  getSourceFiles() {
    const sourceFiles = [];
    const extensions = ['.js', '.ts', '.tsx', '.jsx'];
    
    const walkDir = (dir) => {
      const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
      
      try {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
          if (skipDirs.includes(file)) return;
          
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else if (extensions.some(ext => file.endsWith(ext))) {
            sourceFiles.push(filePath);
          }
        });
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    walkDir(projectRoot);
    return sourceFiles;
  }

  findDangerousFiles() {
    const dangerousFiles = [];
    const dangerousPatterns = [
      /\.bak$/,
      /\.backup$/,
      /\.tmp$/,
      /\.temp$/,
      /~$/,
      /\.orig$/,
      /\.DS_Store$/,
      /\.env\.local$/,
      /\.env\.production$/,
      /database\.sqlite$/,
      /\.log$/,
      /core\.\d+$/,
    ];

    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory() && !['node_modules', '.git'].includes(file)) {
            walkDir(filePath);
          } else if (dangerousPatterns.some(pattern => pattern.test(file))) {
            dangerousFiles.push(path.relative(projectRoot, filePath));
          }
        });
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    walkDir(projectRoot);
    return dangerousFiles;
  }

  // Run all security checks
  async runAudit() {
    console.log('🚀 Starting security audit...\n');
    
    this.checkHardcodedSecrets();
    this.checkEnvironmentConfig();
    this.checkDependencies();
    this.checkFilePermissions();
    this.checkSecurityHeaders();
    this.checkSQLInjection();
    this.checkAuth();
    this.checkHTTPS();
    
    this.generateReport();
  }

  // Generate security audit report
  generateReport() {
    console.log('\n📋 Security Audit Report');
    console.log('========================\n');

    const summary = this.findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {});

    console.log('Summary:');
    Object.entries(summary).forEach(([severity, count]) => {
      const icon = {
        CRITICAL: '🔴',
        HIGH: '🟠',
        MEDIUM: '🟡',
        LOW: '🔵',
        INFO: '⚪'
      }[severity];
      console.log(`${icon} ${severity}: ${count}`);
    });
    
    console.log(`\nTotal findings: ${this.findings.length}\n`);

    // Group findings by category
    const categorized = this.findings.reduce((acc, finding) => {
      if (!acc[finding.category]) {
        acc[finding.category] = [];
      }
      acc[finding.category].push(finding);
      return acc;
    }, {});

    Object.entries(categorized).forEach(([category, findings]) => {
      console.log(`\n${category}:`);
      console.log('-'.repeat(category.length + 1));
      
      findings.forEach((finding, index) => {
        const severityIcon = {
          CRITICAL: '🔴',
          HIGH: '🟠',
          MEDIUM: '🟡',
          LOW: '🔵',
          INFO: '⚪'
        }[finding.severity];
        
        console.log(`\n${index + 1}. ${severityIcon} ${finding.issue}`);
        if (finding.file) {
          console.log(`   File: ${finding.file}`);
        }
        if (finding.recommendation) {
          console.log(`   Recommendation: ${finding.recommendation}`);
        }
      });
    });

    // Save detailed report to file
    const reportPath = path.join(projectRoot, 'security-audit-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      totalFindings: this.findings.length,
      findings: this.findings
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📁 Detailed report saved to: ${reportPath}`);

    // Return exit code based on findings
    const criticalCount = summary.CRITICAL || 0;
    const highCount = summary.HIGH || 0;
    
    if (criticalCount > 0) {
      console.log('\n❌ Audit failed: Critical security issues found');
      process.exit(1);
    } else if (highCount > 0) {
      console.log('\n⚠️  Audit completed with warnings: High severity issues found');
      process.exit(0);
    } else {
      console.log('\n✅ Security audit passed');
      process.exit(0);
    }
  }
}

// Run the audit
const audit = new SecurityAudit();
audit.runAudit().catch(error => {
  console.error('Security audit failed:', error);
  process.exit(1);
});