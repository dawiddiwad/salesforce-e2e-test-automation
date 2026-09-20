/**
 * Credential-safe error propagation.
 *
 * **Why this exists**
 *
 * Failing E2E runs are only debuggable when the upstream diagnostic survives — a jsforce
 * `FIELD_CUSTOM_VALIDATION_EXCEPTION`, a Salesforce CLI exit code, an IMAP transport reset.
 * Discarding the cause makes a failed regression indistinguishable from a product bug.
 *
 * Preserving the cause is the goal. This module exists only to make that safe, and is
 * deliberately scoped to the one thing that makes it unsafe: the Salesforce access token,
 * which `sf org display --json` returns and which jsforce echoes back in session errors.
 * Test artifacts leave the team — the Xray reporter uploads error text and screenshots to
 * Jira — so that token must not travel with them.
 *
 * **The guarantee, and its limit**
 *
 * Every credential the framework handles is passed to {@link SecretRedactor.register} at the
 * point it is obtained, and is thereafter replaced wherever it appears in a propagated cause
 * chain. The match is exact, so nothing else is touched and no diagnostic is ever mangled.
 *
 * A credential that was never registered will survive into the cause. There is no pattern
 * matching fallback on purpose: guessing at credential shapes costs real diagnostics to false
 * positives, and defends against secrets this framework never handles. Register at the source.
 */

const MASK = '«redacted»'

/** Values shorter than this are too collision-prone to replace globally. */
const MINIMUM_REGISTERED_LENGTH = 8

/** Guards against unbounded recursion and cyclic `cause` chains. */
const MAXIMUM_CAUSE_DEPTH = 8

export class SecretRedactor {
	private readonly registered = new Set<string>()

	/**
	 * Registers credential literals to be masked wherever they later appear.
	 *
	 * Safe to call with `undefined`, empty, or short values — those are ignored rather than
	 * rejected, so callers can register optional configuration without branching.
	 */
	register(...values: Array<string | undefined | null>): void {
		for (const value of values) {
			if (typeof value !== 'string') continue
			const trimmed = value.trim()
			if (trimmed.length < MINIMUM_REGISTERED_LENGTH) continue
			this.registered.add(trimmed)
		}
	}

	/** Replaces every registered literal in `text`, leaving everything else untouched. */
	redact(text: string): string {
		let output = text
		for (const secret of this.registered) {
			output = output.split(secret).join(MASK)
		}
		return output
	}

	/**
	 * Returns a credential-free copy of `cause`, preserving the error name, message, stack and
	 * the full `cause` / `AggregateError` chain.
	 *
	 * Non-`Error` values are described rather than thrown away, so a rejected string or a
	 * jsforce error-shaped object still yields a usable diagnostic.
	 */
	sanitize(cause: unknown, depth = 0): Error | undefined {
		if (cause === undefined || cause === null) return undefined
		if (depth >= MAXIMUM_CAUSE_DEPTH) return new Error(`${MASK} (cause chain truncated)`)

		if (cause instanceof Error) {
			const copy = new Error(this.redact(cause.message))
			copy.name = cause.name
			copy.stack = cause.stack ? this.redact(cause.stack) : undefined
			const nested = this.sanitize(cause.cause, depth + 1)
			if (nested) copy.cause = nested
			if (cause instanceof AggregateError) {
				const inner = cause.errors
					.map((each) => this.sanitize(each, depth + 1))
					.filter((each): each is Error => each !== undefined)
				if (inner.length) Object.defineProperty(copy, 'errors', { value: inner, enumerable: false })
			}
			return copy
		}

		return new Error(this.redact(this.describe(cause)))
	}

	private describe(value: unknown): string {
		if (typeof value === 'string') return value
		try {
			return JSON.stringify(value) ?? String(value)
			// eslint-disable-next-line no-restricted-syntax -- the thrown value is a serializer failure on untrusted input; the fallback below is the diagnostic
		} catch {
			return Object.prototype.toString.call(value)
		}
	}
}

/**
 * Process-wide redactor.
 *
 * Playwright workers are separate processes, so each worker maintains its own registry and
 * must register the credentials it obtains. {@link SalesforceCliAuthenticator} and the
 * IMAP and Xray handlers do this at construction time.
 */
export const secrets = new SecretRedactor()

/**
 * Builds the error to throw from a `catch` block: a stable, argument-free message for the
 * report, with the redacted upstream error retained as `cause` for debugging.
 */
export function diagnostic(message: string, cause: unknown): Error {
	return new Error(message, { cause: secrets.sanitize(cause) })
}
