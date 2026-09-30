export function delay(ms: number): Promise<void> {
	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, ms);
	return promise;
}

export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	baseDelay = 1000
): Promise<T> {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: unknown) {
			const isThrottle =
				error instanceof Error &&
				(error.name === 'ThrottlingException' || error.name === 'TooManyRequestsException');

			if (isThrottle && attempt < maxRetries) {
				const delayMs = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
				console.log(
					`Throttling detected, retrying in ${delayMs.toFixed(0)}ms (attempt ${attempt + 1}/${maxRetries + 1})`
				);
				await delay(delayMs);
				continue;
			}
			throw error;
		}
	}
	throw new Error('Max retries exceeded');
}

export class RateLimiter {
	private readonly queue: Array<() => void> = [];
	private running = 0;
	private readonly maxConcurrent: number;
	private readonly minDelay: number;

	constructor(maxConcurrent = 3, minDelay = 100) {
		this.maxConcurrent = maxConcurrent;
		this.minDelay = minDelay;
	}

	async acquire(): Promise<void> {
		if (this.running < this.maxConcurrent) {
			this.running++;
			await delay(this.minDelay);
			return;
		}

		const { promise, resolve } = Promise.withResolvers<void>();
		this.queue.push(resolve);
		return promise;
	}

	release(): void {
		this.running--;
		if (this.queue.length > 0) {
			const next = this.queue.shift();
			if (next) {
				this.running++;
				setTimeout(next, this.minDelay);
			}
		}
	}
}

export const taskDefLimiter = new RateLimiter(3, 200);

/* Client Rate Limiting */
interface RateLimitEntry {
	count: number;
	resetTime: number;
	blocked: boolean;
	blockUntil?: number;
}

export class ClientRateLimiter {
	private store = new Map<string, RateLimitEntry>();
	private violations = new Map<string, number>();

	constructor(
		private readonly maxRequests = 10,
		private readonly windowMs = 60000,
		private readonly blockDurationMs = 300000,
		private readonly maxViolations = 3
	) {}

	check(identifier: string): { allowed: boolean; resetTime?: number; blockUntil?: number } {
		const now = Date.now();
		const entry = this.store.get(identifier);

		if (entry?.blocked && entry.blockUntil) {
			if (now < entry.blockUntil) {
				return { allowed: false, blockUntil: entry.blockUntil };
			}
			this.store.delete(identifier);
			this.violations.delete(identifier);
		}

		if (!entry || now > entry.resetTime) {
			this.store.set(identifier, {
				count: 1,
				resetTime: now + this.windowMs,
				blocked: false
			});
			return { allowed: true, resetTime: now + this.windowMs };
		}

		entry.count++;
		if (entry.count > this.maxRequests) {
			const violationCount = (this.violations.get(identifier) || 0) + 1;
			this.violations.set(identifier, violationCount);

			if (violationCount >= this.maxViolations) {
				entry.blocked = true;
				entry.blockUntil = now + this.blockDurationMs;
				return { allowed: false, blockUntil: entry.blockUntil };
			}
			return { allowed: false, resetTime: entry.resetTime };
		}

		return { allowed: true, resetTime: entry.resetTime };
	}
}

export const metricsRateLimiter = new ClientRateLimiter(10, 60000, 300000, 3);
export const servicesRateLimiter = new ClientRateLimiter(20, 60000, 180000, 3);

export function getClientIdentifier(request: Request): string {
	const forwarded = request.headers.get('x-forwarded-for');
	const ip = forwarded
		? forwarded.split(',')[0].trim()
		: request.headers.get('x-real-ip') || '127.0.0.1';
	const userAgent = request.headers.get('user-agent') || 'unknown';
	return `${ip}-${userAgent.substring(0, 50)}`;
}

export function validateTimeRange(
	startTime: Date,
	endTime: Date,
	maxDays = 7
): { valid: boolean; error?: string } {
	const now = new Date();
	const maxRangeMs = maxDays * 24 * 60 * 60 * 1000;
	const maxFutureMs = 24 * 60 * 60 * 1000;

	if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
		return { valid: false, error: 'Invalid date format' };
	}

	if (startTime >= endTime) {
		return { valid: false, error: 'Start time must be before end time' };
	}

	const rangeMs = endTime.getTime() - startTime.getTime();
	if (rangeMs > maxRangeMs) {
		return { valid: false, error: `Time range too large (max ${maxDays} days)` };
	}

	if (endTime.getTime() > now.getTime() + maxFutureMs) {
		return { valid: false, error: 'End time cannot be more than 1 day in the future' };
	}

	return { valid: true };
}

export function validateInput(input: string, maxLength = 100): { valid: boolean; error?: string } {
	if (!input || typeof input !== 'string') {
		return { valid: false, error: 'Input must be a non-empty string' };
	}

	if (input.length > maxLength) {
		return { valid: false, error: `Input too long (max ${maxLength} characters)` };
	}

	const suspiciousPatterns = [
		/[<>]/g,
		/javascript:/gi,
		/on\w+=/gi,
		/script/gi,
		/;.*--/g,
		/union.*select/gi,
		/drop.*table/gi
	];

	for (const pattern of suspiciousPatterns) {
		if (pattern.test(input)) {
			return { valid: false, error: 'Input contains invalid characters or patterns' };
		}
	}

	return { valid: true };
}
