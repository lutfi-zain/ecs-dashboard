// Rate limiter utility untuk mencegah bruteforce attacks
// Menggunakan in-memory store (untuk production sebaiknya gunakan Redis)

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  blockUntil?: number
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number
  private readonly blockDurationMs: number
  private readonly maxViolations: number
  private violations: Map<string, number> = new Map()

  constructor(
    maxRequests: number = 10, // Max requests per window
    windowMs: number = 60000, // 1 minute window
    blockDurationMs: number = 300000, // 5 minutes block
    maxViolations: number = 3 // Block after 3 violations
  ) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.blockDurationMs = blockDurationMs
    this.maxViolations = maxViolations

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 300000)
  }

  check(identifier: string): { allowed: boolean; resetTime?: number; blockUntil?: number } {
    const now = Date.now()
    const entry = this.store.get(identifier)

    // Check if blocked
    if (entry?.blocked && entry.blockUntil) {
      if (now < entry.blockUntil) {
        return { allowed: false, blockUntil: entry.blockUntil }
      } else {
        // Unblock
        this.store.delete(identifier)
        this.violations.delete(identifier)
      }
    }

    // Initialize or check if window expired
    if (!entry || now > entry.resetTime) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
        blocked: false,
      })
      return { allowed: true, resetTime: now + this.windowMs }
    }

    // Increment count
    entry.count++

    // Check if exceeded limit
    if (entry.count > this.maxRequests) {
      const violationCount = (this.violations.get(identifier) || 0) + 1
      this.violations.set(identifier, violationCount)

      // Block if too many violations
      if (violationCount >= this.maxViolations) {
        entry.blocked = true
        entry.blockUntil = now + this.blockDurationMs
        return { allowed: false, blockUntil: entry.blockUntil }
      }

      return { allowed: false, resetTime: entry.resetTime }
    }

    return { allowed: true, resetTime: entry.resetTime }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      // Remove expired entries
      if (now > entry.resetTime && (!entry.blocked || (entry.blockUntil && now > entry.blockUntil))) {
        this.store.delete(key)
        this.violations.delete(key)
      }
    }
  }

  reset(identifier: string) {
    this.store.delete(identifier)
    this.violations.delete(identifier)
  }

  getStats(identifier: string) {
    const entry = this.store.get(identifier)
    if (!entry) return null

    return {
      count: entry.count,
      resetTime: entry.resetTime,
      blocked: entry.blocked,
      blockUntil: entry.blockUntil,
      violations: this.violations.get(identifier) || 0,
    }
  }
}

// Create rate limiter instances for different endpoints
export const metricsRateLimiter = new RateLimiter(
  10, // 10 requests
  60000, // per minute
  300000, // block for 5 minutes
  3 // after 3 violations
)

export const servicesRateLimiter = new RateLimiter(
  20, // 20 requests (lebih tinggi karena lebih ringan)
  60000, // per minute
  180000, // block for 3 minutes
  3
)

// Helper untuk mendapatkan identifier dari request
export function getClientIdentifier(request: Request): string {
  // Gunakan kombinasi IP dan User-Agent untuk identifier
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Hash sederhana untuk privacy
  return `${ip}-${userAgent.substring(0, 50)}`
}

// Validate time range to prevent resource exhaustion
export function validateTimeRange(startTime: Date, endTime: Date): {
  valid: boolean
  error?: string
} {
  const now = new Date()
  const maxRangeMs = 30 * 24 * 60 * 60 * 1000 // 30 days
  const maxFutureMs = 24 * 60 * 60 * 1000 // 1 day in future

  // Check if times are valid dates
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return { valid: false, error: 'Invalid date format' }
  }

  // Check if start is before end
  if (startTime >= endTime) {
    return { valid: false, error: 'Start time must be before end time' }
  }

  // Check if range is too large
  const rangeMs = endTime.getTime() - startTime.getTime()
  if (rangeMs > maxRangeMs) {
    return { valid: false, error: 'Time range too large (max 30 days)' }
  }

  // Check if end time is too far in the future
  if (endTime.getTime() > now.getTime() + maxFutureMs) {
    return { valid: false, error: 'End time cannot be more than 1 day in the future' }
  }

  // Check if start time is too old (AWS CloudWatch retention)
  const maxHistoryMs = 455 * 24 * 60 * 60 * 1000 // 455 days (AWS limit)
  if (startTime.getTime() < now.getTime() - maxHistoryMs) {
    return { valid: false, error: 'Start time too old (max 455 days ago)' }
  }

  return { valid: true }
}

// Validate input strings to prevent injection
export function validateInput(input: string, maxLength: number = 100): {
  valid: boolean
  error?: string
} {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input must be a non-empty string' }
  }

  if (input.length > maxLength) {
    return { valid: false, error: `Input too long (max ${maxLength} characters)` }
  }

  // Check for suspicious patterns (basic SQL injection, XSS prevention)
  const suspiciousPatterns = [
    /[<>]/g, // HTML tags
    /javascript:/gi, // JavaScript protocol
    /on\w+=/gi, // Event handlers
    /script/gi, // Script tag
    /;.*--/g, // SQL comment
    /union.*select/gi, // SQL union
    /drop.*table/gi, // SQL drop
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return { valid: false, error: 'Input contains invalid characters or patterns' }
    }
  }

  return { valid: true }
}

// Whitelist untuk cluster names (lebih secure)
export const ALLOWED_CLUSTERS = [
  'kairos-pay-cluster-ecs-iac',
  'kairos-his-cluster-ecs-iac',
  'kairos-pas-cluster-ecs-iac',
  'kairos-fe-cluster-ecs-iac',
]

export function isAllowedCluster(clusterName: string): boolean {
  return ALLOWED_CLUSTERS.includes(clusterName)
}
