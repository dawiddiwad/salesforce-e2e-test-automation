import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { inspect } from 'node:util'
import { SecretRedactor, diagnostic, secrets } from '../../src/errors/redaction'

const MASK = '«redacted»'
let redactor: SecretRedactor

beforeEach(() => {
	redactor = new SecretRedactor()
})

test('registered literals are masked wherever they appear', () => {
	const token = 'synthetic-access-token-value'
	redactor.register(token)
	assert.equal(redactor.redact(`before ${token} after ${token}`), `before ${MASK} after ${MASK}`)
})

test('registration ignores values too short or too weakly typed to match safely', () => {
	redactor.register('short', '', '   ', undefined, null)
	assert.equal(redactor.redact('short and sweet'), 'short and sweet')
})

test('registration is resilient to regex metacharacters in credentials', () => {
	const token = 'a+b.c*d(e)f[g]$h^i'
	redactor.register(token)
	assert.equal(redactor.redact(`value=${token};`), `value=${MASK};`)
})

test('an unregistered credential is deliberately not guessed at', () => {
	assert.equal(
		redactor.redact('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.body.signature'),
		'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.body.signature'
	)
})

test('actionable Salesforce diagnostics survive redaction untouched', () => {
	redactor.register('synthetic-access-token-value')
	for (const diagnosticText of [
		'INVALID_SESSION_ID: Session expired or invalid',
		'FIELD_CUSTOM_VALIDATION_EXCEPTION: Start date must precede end date',
		'DUPLICATE_VALUE: duplicate value found: ExternalId__c',
		'INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY',
		'MALFORMED_QUERY: unexpected token: SELCT',
		'Salesforce CLI exit code 2: No authorization information found',
	]) {
		assert.equal(redactor.redact(diagnosticText), diagnosticText)
	}
})

test('sanitize preserves the error name, message and nested cause chain', () => {
	redactor.register('synthetic-access-token-value')
	const root = new TypeError('socket hang up')
	const upstream = new Error('DUPLICATE_VALUE on synthetic-access-token-value', { cause: root })
	const sanitized = redactor.sanitize(upstream)

	assert.ok(sanitized instanceof Error)
	assert.equal(sanitized.name, 'Error')
	assert.equal(sanitized.message, `DUPLICATE_VALUE on ${MASK}`)
	assert.ok(sanitized.cause instanceof Error)
	assert.equal((sanitized.cause as Error).name, 'TypeError')
	assert.equal((sanitized.cause as Error).message, 'socket hang up')
	assert.equal(upstream.message, 'DUPLICATE_VALUE on synthetic-access-token-value')
})

test('sanitize truncates rather than hangs on a cyclic cause chain', () => {
	const cyclic: Error = new Error('looping failure')
	cyclic.cause = cyclic
	const sanitized = redactor.sanitize(cyclic)
	assert.ok(sanitized instanceof Error)
	assert.match(inspect(sanitized, { depth: null }), /cause chain truncated/)
})

test('sanitize describes non-Error rejections instead of discarding them', () => {
	redactor.register('synthetic-access-token-value')
	assert.equal(redactor.sanitize('plain string rejection')?.message, 'plain string rejection')
	assert.equal(
		redactor.sanitize({ errorCode: 'NOT_FOUND', token: 'synthetic-access-token-value' })?.message,
		`{"errorCode":"NOT_FOUND","token":"${MASK}"}`
	)
	assert.equal(redactor.sanitize({ errorCode: 'NOT_FOUND' })?.message, '{"errorCode":"NOT_FOUND"}')
	assert.equal(redactor.sanitize(undefined), undefined)
	assert.equal(redactor.sanitize(null), undefined)
})

test('sanitize retains AggregateError members', () => {
	const aggregate = new AggregateError([new Error('first failed'), new Error('second failed')], 'both failed')
	const sanitized = redactor.sanitize(aggregate) as AggregateError
	assert.equal(sanitized.name, 'AggregateError')
	assert.equal(sanitized.message, 'both failed')
	assert.deepEqual(
		sanitized.errors.map((each: Error) => each.message),
		['first failed', 'second failed']
	)
})

test('diagnostic wraps a stable message around a redacted cause', () => {
	secrets.register('synthetic-module-level-secret')
	const wrapped = diagnostic('unable to create Salesforce record', new Error('boom synthetic-module-level-secret'))
	assert.equal(wrapped.message, 'unable to create Salesforce record')
	assert.equal((wrapped.cause as Error).message, `boom ${MASK}`)
})

test('diagnostic omits the cause entirely when there is nothing to attach', () => {
	assert.equal(diagnostic('failed', undefined).cause, undefined)
})
