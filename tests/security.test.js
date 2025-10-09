// Security Implementation Testing Script
// Tests various security features implemented in the POS system

const TEST_CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8001',
  adminCredentials: {
    username: 'admin',
    password: 'password'
  }
}

class SecurityTester {
  constructor() {
    this.results = []
  }

  log(test, status, message, details = null) {
    const result = {
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    }
    this.results.push(result)
    console.log(`[${status}] ${test}: ${message}`)
    if (details) console.log('  Details:', details)
  }

  async testSecurityHeaders() {
    console.log('\n=== Testing Security Headers ===')

    try {
      const response = await fetch(TEST_CONFIG.frontendUrl)
      const headers = response.headers

      // Test required security headers
      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'referrer-policy'
      ]

      for (const header of requiredHeaders) {
        if (headers.has(header)) {
          this.log(
            `Security Header: ${header}`,
            'PASS',
            `Header present: ${headers.get(header)}`
          )
        } else {
          this.log(
            `Security Header: ${header}`,
            'FAIL',
            'Header missing'
          )
        }
      }

      // Test HSTS header (only available over HTTPS)
      if (headers.has('strict-transport-security')) {
        this.log(
          'Security Header: HSTS',
          'PASS',
          `HSTS enabled: ${headers.get('strict-transport-security')}`
        )
      } else {
        this.log(
          'Security Header: HSTS',
          'INFO',
          'HSTS not present (expected for HTTP in development)'
        )
      }

    } catch (error) {
      this.log(
        'Security Headers Test',
        'ERROR',
        'Failed to fetch frontend',
        error.message
      )
    }
  }

  async testCORSRestrictions() {
    console.log('\n=== Testing CORS Restrictions ===')

    try {
      // Test allowed origin (localhost)
      const response = await fetch(`${TEST_CONFIG.backendUrl}/health`, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })

      if (response.ok) {
        const corsHeader = response.headers.get('access-control-allow-origin')
        this.log(
          'CORS Allowed Origin',
          'PASS',
          `Localhost allowed: ${corsHeader}`
        )
      }

      // Test rate limiting on health endpoint
      const rateLimitPromises = []
      for (let i = 0; i < 35; i++) {
        rateLimitPromises.push(fetch(`${TEST_CONFIG.backendUrl}/health`))
      }

      const rateLimitResponses = await Promise.all(rateLimitPromises)
      const rateLimitedResponses = rateLimitResponses.filter(r => r.status === 429)

      if (rateLimitedResponses.length > 0) {
        this.log(
          'Rate Limiting',
          'PASS',
          `Rate limiting active: ${rateLimitedResponses.length} requests blocked`
        )
      } else {
        this.log(
          'Rate Limiting',
          'INFO',
          'Rate limiting not triggered (may need more requests)'
        )
      }

    } catch (error) {
      this.log(
        'CORS Test',
        'ERROR',
        'Failed to test CORS',
        error.message
      )
    }
  }

  async testAuthenticationFlow() {
    console.log('\n=== Testing Authentication Flow ===')

    try {
      // Test login page accessibility
      const loginResponse = await fetch(`${TEST_CONFIG.frontendUrl}/login`)
      if (loginResponse.ok) {
        this.log(
          'Login Page Access',
          'PASS',
          'Login page accessible'
        )
      } else {
        this.log(
          'Login Page Access',
          'FAIL',
          `Login page returned ${loginResponse.status}`
        )
      }

      // Test dashboard protection (should redirect to login)
      const dashboardResponse = await fetch(`${TEST_CONFIG.frontendUrl}/dashboard`, {
        redirect: 'manual'
      })

      if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
        const location = dashboardResponse.headers.get('location')
        if (location && location.includes('/login')) {
          this.log(
            'Dashboard Protection',
            'PASS',
            'Dashboard redirects to login when unauthenticated'
          )
        } else {
          this.log(
            'Dashboard Protection',
            'WARN',
            `Dashboard redirects but not to login: ${location}`
          )
        }
      } else {
        this.log(
          'Dashboard Protection',
          'FAIL',
          `Dashboard should redirect but returned ${dashboardResponse.status}`
        )
      }

    } catch (error) {
      this.log(
        'Authentication Flow Test',
        'ERROR',
        'Failed to test authentication',
        error.message
      )
    }
  }

  async testBackendSecurity() {
    console.log('\n=== Testing Backend Security ===')

    try {
      // Test health endpoint
      const healthResponse = await fetch(`${TEST_CONFIG.backendUrl}/health`)
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        this.log(
          'Backend Health Check',
          'PASS',
          'Health endpoint accessible',
          healthData
        )

        // Check for correlation ID
        if (healthData.correlation_id) {
          this.log(
            'Correlation ID',
            'PASS',
            'Correlation ID present in response'
          )
        }
      }

      // Test protected admin endpoint without auth
      const adminResponse = await fetch(`${TEST_CONFIG.backendUrl}/api/v1/admin/stats`)
      if (adminResponse.status === 401 || adminResponse.status === 403) {
        this.log(
          'Admin Endpoint Protection',
          'PASS',
          'Admin endpoint properly protected'
        )
      } else {
        this.log(
          'Admin Endpoint Protection',
          'FAIL',
          `Admin endpoint should return 401/403 but returned ${adminResponse.status}`
        )
      }

      // Test CORS headers on backend
      const corsResponse = await fetch(`${TEST_CONFIG.backendUrl}/`, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })

      const corsHeaders = corsResponse.headers.get('access-control-allow-origin')
      if (corsHeaders) {
        this.log(
          'Backend CORS Headers',
          'PASS',
          `CORS headers present: ${corsHeaders}`
        )
      }

    } catch (error) {
      this.log(
        'Backend Security Test',
        'ERROR',
        'Failed to test backend security',
        error.message
      )
    }
  }

  async testCSPCompliance() {
    console.log('\n=== Testing CSP Compliance ===')

    try {
      const response = await fetch(TEST_CONFIG.frontendUrl)
      const cspHeader = response.headers.get('content-security-policy')

      if (cspHeader) {
        this.log(
          'CSP Header Present',
          'PASS',
          'Content Security Policy header found'
        )

        // Check for key CSP directives
        const expectedDirectives = [
          'default-src',
          'script-src',
          'style-src',
          'img-src',
          'connect-src'
        ]

        for (const directive of expectedDirectives) {
          if (cspHeader.includes(directive)) {
            this.log(
              `CSP Directive: ${directive}`,
              'PASS',
              'Directive present in CSP'
            )
          } else {
            this.log(
              `CSP Directive: ${directive}`,
              'FAIL',
              'Directive missing from CSP'
            )
          }
        }
      } else {
        this.log(
          'CSP Header',
          'FAIL',
          'Content Security Policy header missing'
        )
      }

    } catch (error) {
      this.log(
        'CSP Compliance Test',
        'ERROR',
        'Failed to test CSP',
        error.message
      )
    }
  }

  generateReport() {
    console.log('\n=== Security Test Report ===')

    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      warnings: this.results.filter(r => r.status === 'WARN').length,
      info: this.results.filter(r => r.status === 'INFO').length,
      errors: this.results.filter(r => r.status === 'ERROR').length
    }

    console.log('Summary:')
    console.log(`  Total Tests: ${summary.total}`)
    console.log(`  Passed: ${summary.passed}`)
    console.log(`  Failed: ${summary.failed}`)
    console.log(`  Warnings: ${summary.warnings}`)
    console.log(`  Info: ${summary.info}`)
    console.log(`  Errors: ${summary.errors}`)

    const score = Math.round((summary.passed / (summary.total - summary.info - summary.errors)) * 100)
    console.log(`\nSecurity Score: ${score}%`)

    if (summary.failed > 0) {
      console.log('\nFailed Tests:')
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.test}: ${r.message}`))
    }

    return {
      summary,
      score,
      results: this.results
    }
  }

  async runAllTests() {
    console.log('Starting Security Test Suite...')
    console.log('Frontend URL:', TEST_CONFIG.frontendUrl)
    console.log('Backend URL:', TEST_CONFIG.backendUrl)

    await this.testSecurityHeaders()
    await this.testCORSRestrictions()
    await this.testAuthenticationFlow()
    await this.testBackendSecurity()
    await this.testCSPCompliance()

    return this.generateReport()
  }
}

// Export for use in other test files or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityTester
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  const tester = new SecurityTester()
  tester.runAllTests().then(() => {
    console.log('\nSecurity testing complete!')
  }).catch(error => {
    console.error('Security testing failed:', error)
    process.exit(1)
  })
}