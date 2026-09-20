import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test, type TestContext } from 'node:test'
import { inspect } from 'node:util'
import { test as reportingTest } from '../runners/custom-test-runner'
import { ImapHandler } from '../../src/api/email/imap-handler'
import XrayReporter from '../reporters/xray/xray-reporter'

const secret = 'synthetic-boundary-secret'
const rawFailure = () => Object.assign(new Error(secret, { cause: new Error(secret) }), { password: secret })

function captureSteps(t: TestContext) {
	const errors: unknown[] = []
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => {
		try {
			return await body()
		} catch (error) {
			errors.push(error)
			throw error
		}
	})
	return errors
}

function assertSanitized(error: unknown, message: string) {
	assert.ok(error instanceof Error)
	assert.equal(error.message, message)
	assert.equal(error.cause, undefined)
	assert.ok(!inspect(error, { depth: null }).includes(secret))
	return true
}

function imapWith(api: object): ImapHandler {
	const handler = Object.create(ImapHandler.prototype) as ImapHandler
	Object.defineProperty(handler, 'api', { value: api })
	return handler
}

for (const synchronous of [false, true]) {
	for (const operation of ['connect', 'mailbox', 'search', 'disconnect'] as const) {
		test(`IMAP ${operation} sanitizes ${synchronous ? 'synchronous' : 'callback'} failures`, async (t) => {
			const errors = captureSteps(t)
			const fail = (callback: (error: Error) => void) => {
				if (synchronous) throw rawFailure()
				queueMicrotask(() => callback(rawFailure()))
			}
			const api = Object.assign(new EventEmitter(), {
				connect: () => fail((error) => api.emit('error', error)),
				openBox: (_name: string, _readOnly: boolean, callback: (error: Error) => void) => fail(callback),
				search: (_criteria: unknown, callback: (error: Error) => void) => fail(callback),
				end: () => fail((error) => api.emit('error', error)),
			})
			const handler = imapWith(api)
			const operations = {
				connect: { run: () => handler.connect(), message: 'Unable to connect to IMAP server' },
				mailbox: { run: () => handler.openBox(secret), message: 'Unable to open IMAP mailbox' },
				search: {
					run: () => handler.searchByTypeAndValue('TO', secret),
					message: 'Unable to search IMAP mailbox',
				},
				disconnect: { run: () => handler.disconnect(), message: 'Unable to disconnect from IMAP server' },
			}
			await assert.rejects(operations[operation].run(), (error) =>
				assertSanitized(error, operations[operation].message)
			)
			assert.equal(errors.length, 1)
			assertSanitized(errors[0], operations[operation].message)
		})
	}
}

class ReporterUnderTest extends XrayReporter {
	login() {
		return this.authenticate()
	}
	upload() {
		return this.postFullResult()
	}
}

function reporterWith(post: (...args: unknown[]) => Promise<unknown>): ReporterUnderTest {
	return Object.assign(Object.create(ReporterUnderTest.prototype) as ReporterUnderTest, {
		urlInstance: 'https://example.invalid',
		pathAuthenticate: '/authenticate',
		pathImportExecution: '/execution',
		options: { clientId: secret, clientSecret: secret, testPlanKey: 'TEST-1' },
		bearerToken: { Authorization: `Bearer ${secret}` },
		fullTestResult: { tests: [] },
		request: Promise.resolve({ post }),
	})
}

for (const operation of ['login', 'upload'] as const) {
	for (const failure of ['transport', 'http'] as const) {
		test(`Xray ${operation} sanitizes ${failure} failures`, async (t) => {
			t.mock.method(console, 'info', () => {})
			const reporter = reporterWith(async () => {
				if (failure === 'transport') throw rawFailure()
				return { ok: () => false, json: () => assert.fail('error body must not be read') }
			})
			const message = operation === 'login' ? '⛔ unable to authenticate Xray' : '⛔ unable to post Xray results'
			await assert.rejects(reporter[operation](), (error) => assertSanitized(error, message))
		})
	}
}

test('Xray sanitizes malformed authentication bodies', async () => {
	for (const json of [
		async () => {
			throw rawFailure()
		},
		async () => ({ secret }),
		async () => '',
	]) {
		await assert.rejects(reporterWith(async () => ({ ok: () => true, json })).login(), (error) =>
			assertSanitized(error, '⛔ unable to authenticate Xray')
		)
	}
})

test('Xray still forwards credentials and uploads with the returned bearer token', async (t) => {
	t.mock.method(console, 'info', () => {})
	const requests: unknown[][] = []
	const reporter = reporterWith(async (...args) => {
		requests.push(args)
		return { ok: () => true, json: async () => secret }
	})
	assert.deepEqual(await reporter.login(), { Authorization: `Bearer ${secret}` })
	await reporter.upload()
	assert.deepEqual(requests, [
		['https://example.invalid/authenticate', { data: { client_id: secret, client_secret: secret } }],
		['https://example.invalid/execution', { data: { tests: [] }, headers: { Authorization: `Bearer ${secret}` } }],
	])
})
