import assert from 'node:assert/strict'
import { inspect } from 'node:util'
import { test, type TestContext } from 'node:test'
import { test as playwrightTest, step } from '../runners/custom-test-runner'
import { RestApiHandler, EmptyQueryResultError } from '../../src/api/salesforce/rest-api-handler'
import childProcess, { type ExecException } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { Connection } from 'jsforce'
import type { Page } from '@playwright/test'
import { SalesforceCliHandler } from '../../src/cli/salesforce-cli-handler'
import { SalesforceCliAuthenticator } from '../../src/authorization/salesforce-cli-authenticator'
import { DefaultSalesforceCliUser } from '../../src/users/default-salesforce-cli-users'

const secret = 'synthetic-client-secret-do-not-log'
const clientId = 'synthetic-client-id-do-not-log'
const source = `String clientSecret = '${secret}';`
const successfulResult = {
	success: true,
	compiled: true,
	line: -1,
	column: -1,
	compileProblem: null,
	exceptionMessage: null,
	exceptionStackTrace: null,
}

function captureSteps(t: TestContext) {
	const titles: string[] = []
	const errors: unknown[] = []
	t.mock.method(
		playwrightTest,
		'step',
		async (title: string, body: () => Promise<unknown>, options: { box?: boolean }) => {
			titles.push(title)
			assert.equal(options.box, true)
			try {
				return await body()
			} catch (error) {
				errors.push(error)
				throw error
			}
		}
	)
	return { titles, errors }
}

function handlerWith(connection: object): RestApiHandler {
	const handler = Object.create(RestApiHandler.prototype) as RestApiHandler
	Object.defineProperty(handler, 'connection', { value: connection })
	return handler
}

function assertSafe(captured: { titles: string[]; errors: unknown[] }) {
	const artifacts = inspect(captured, { depth: null })
	assert.ok(!artifacts.includes(secret))
	assert.ok(!artifacts.includes(clientId))
	assert.ok(!artifacts.includes(source))
	for (const error of captured.errors) {
		assert.ok(error instanceof Error)
		assert.equal(error.cause, undefined)
	}
}

test('step titles omit every argument without changing receiver, arguments, or return value', async (t) => {
	const captured = captureSteps(t)
	const cyclic: { self?: object; clientSecret: string } = { clientSecret: secret }
	cyclic.self = cyclic
	const result = { clientId }
	const args = [secret, [clientId], cyclic, undefined, { toJSON: () => assert.fail('must not serialize') }]
	class Example {
		@step
		async acceptCredentials(...received: unknown[]) {
			assert.equal(this, example)
			assert.deepEqual(received, args)
			return result
		}
	}
	const example = new Example()
	assert.equal(await example.acceptCredentials(...args), result)
	assert.deepEqual(captured.titles, ['Example > Accept Credentials'])
	assertSafe(captured)
})

test('step preserves thrown error identity', async (t) => {
	captureSteps(t)
	const expected = new Error('safe failure')
	class Example {
		@step
		async fail() {
			throw expected
		}
	}
	await assert.rejects(new Example().fail(), (error: unknown) => error === expected)
})

test('executeApex forwards source and returns successful result without logging source', async (t) => {
	const captured = captureSteps(t)
	const handler = handlerWith({
		tooling: {
			executeAnonymous: async (body: string) => {
				assert.equal(body, source)
				return successfulResult
			},
		},
	})
	assert.equal(await handler.executeApex(source), successfulResult)
	assert.deepEqual(captured.titles, ['RestApiHandler > Execute Apex'])
	assertSafe(captured)
})

test('executeApex failure exposes only validated status and location metadata', async (t) => {
	const captured = captureSteps(t)
	const handler = handlerWith({
		tooling: {
			executeAnonymous: async () => ({
				...successfulResult,
				success: false,
				compiled: false,
				line: 7,
				column: 12,
				compileProblem: source,
				exceptionMessage: secret,
				exceptionStackTrace: clientId,
			}),
		},
	})
	await assert.rejects(handler.executeApex(source), {
		message: 'failed executing anonymous Apex (compiled=false, line=7, column=12)',
	})
	assertSafe(captured)
})

test('executeApex rejects untrusted metadata and transport errors without retaining a cause', async (t) => {
	const captured = captureSteps(t)
	for (const executeAnonymous of [
		async () => ({ success: false, compiled: secret, line: secret, column: clientId }),
		async () => {
			throw new Error(source, { cause: new Error(clientId) })
		},
	]) {
		await assert.rejects(handlerWith({ tooling: { executeAnonymous } }).executeApex(source), {
			message: 'failed executing anonymous Apex',
		})
	}
	assertSafe(captured)
})

test('update forwards payload on success but omits payload and upstream diagnostics on failure', async (t) => {
	const captured = captureSteps(t)
	const payload = { Id: 'synthetic-record', Secret__c: secret }
	const result = { id: payload.Id, success: true, errors: [] }
	const handler = handlerWith({
		update: async (name: string, data: object, options: object) => {
			assert.equal(name, 'Account')
			assert.equal(data, payload)
			assert.deepEqual(options, { allOrNone: true })
			return result
		},
	})
	assert.equal(await handler.update('Account', payload), result)
	const failingHandler = handlerWith({
		update: async () => {
			throw new Error(`${secret}: ${clientId}`)
		},
	})
	await assert.rejects(failingHandler.update('Account', payload), { message: 'unable to update Salesforce record' })
	assertSafe(captured)
})

test('query preserves typed empty results and successful forwarding without logging SOQL', async (t) => {
	const captured = captureSteps(t)
	const result = { records: [], done: true, totalSize: 0 }
	const handler = handlerWith({
		query: async (soql: string) => {
			assert.equal(soql, source)
			return result
		},
	})
	await assert.rejects(handler.query(source), EmptyQueryResultError)
	assert.equal(await handler.query(source, true), result)
	assertSafe(captured)
})

test('CRUD failures discard upstream diagnostics and request context', async (t) => {
	const captured = captureSteps(t)
	const fail = async () => {
		throw new Error(`${secret}: ${clientId}`)
	}
	const handler = handlerWith({ create: fail, retrieve: fail, delete: fail })
	await assert.rejects(handler.create('Account', { Secret__c: secret }), {
		message: 'unable to create Salesforce record',
	})
	await assert.rejects(handler.read('Account', secret), { message: 'unable to read Salesforce record' })
	await assert.rejects(handler.delete('Account', secret), { message: 'unable to delete Salesforce record' })
	assertSafe(captured)
})

test('CRUD success forwards requests and returns original responses', async (t) => {
	const captured = captureSteps(t)
	const data = { Secret__c: secret }
	const saved = { id: 'synthetic-id', success: true, errors: [] }
	const record = { Id: saved.id, ...data }
	const handler = handlerWith({
		create: async (name: string, payload: object, options: object) => {
			assert.equal(name, 'Account')
			assert.equal(payload, data)
			assert.deepEqual(options, { allOrNone: true })
			return saved
		},
		retrieve: async (name: string, id: string) => {
			assert.equal(name, 'Account')
			assert.equal(id, saved.id)
			return record
		},
		delete: async (name: string, id: string) => {
			assert.equal(name, 'Account')
			assert.equal(id, saved.id)
			return saved
		},
	})
	assert.equal(await handler.create('Account', data), saved)
	assert.equal(await handler.read('Account', saved.id), record)
	assert.equal(await handler.delete('Account', saved.id), saved)
	assertSafe(captured)
})

test('REST identity failures sanitize both asynchronous and synchronous errors', async (t) => {
	const captured = captureSteps(t)
	const credentials = { accessToken: secret, instanceUrl: new URL('https://example.invalid') }
	const identity = t.mock.method(Connection.prototype, 'identity', async () => {
		throw new Error(secret)
	})
	await assert.rejects(new RestApiHandler(credentials).ready, (error: unknown) => {
		captured.errors.push(error)
		return error instanceof Error && error.message === 'unable to authenticate Salesforce Rest API'
	})
	identity.mock.mockImplementation(() => {
		throw new Error(clientId)
	})
	assert.throws(
		() => new RestApiHandler(credentials),
		(error: unknown) => {
			captured.errors.push(error)
			return error instanceof Error && error.message === 'unable to authenticate Salesforce Rest API'
		}
	)
	assertSafe(captured)
})

test('authenticator and default user sanitize target org, API, and cookie failures', async (t) => {
	const captured = captureSteps(t)
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async () => {
		throw new Error(`${secret}: ${clientId}`)
	})
	for (const ready of [
		new SalesforceCliAuthenticator(new SalesforceCliHandler()).ready,
		new DefaultSalesforceCliUser().ready,
	]) {
		await assert.rejects(ready, (error: unknown) => {
			captured.errors.push(error)
			return error instanceof Error
		})
	}
	runCommand.mock.mockImplementation(async () => ({
		result: {
			connectedStatus: 'Connected',
			accessToken: secret,
			instanceUrl: 'https://example.invalid',
		},
	}))
	const auth = await new SalesforceCliAuthenticator(new SalesforceCliHandler()).ready
	t.mock.method(Connection.prototype, 'identity', async () => {
		throw new Error(secret)
	})
	await assert.rejects(auth.authenticateApi(), { message: 'failed authenticating Salesforce API context' })
	const page = {
		context: () => ({
			addCookies: async () => {
				throw new Error(clientId)
			},
		}),
	} as unknown as Page
	await assert.rejects(auth.authenticateUi(page), { message: 'failed authenticating Salesforce UI context' })
	assertSafe(captured)
})

test('successful authentication forwards credentials without logging them', async (t) => {
	const captured = captureSteps(t)
	t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async () => ({
		result: { connectedStatus: 'Connected', accessToken: secret, instanceUrl: 'https://example.invalid' },
	}))
	t.mock.method(Connection.prototype, 'identity', async function (this: Connection) {
		assert.equal(this.accessToken, secret)
		return {}
	})
	const auth = await new SalesforceCliAuthenticator(new SalesforceCliHandler()).ready
	const handler = await auth.authenticateApi()
	assert.equal(await handler.ready, handler)
	let cookiesAdded = false
	const page = {
		context: () => ({
			addCookies: async (cookies: unknown) => {
				assert.deepEqual(cookies, [{ name: 'sid', value: secret, url: 'https://example.invalid/' }])
				cookiesAdded = true
			},
		}),
	} as unknown as Page
	assert.equal(await auth.authenticateUi(page), page)
	assert.equal(cookiesAdded, true)
	assertSafe(captured)
})

test('CLI logs and failures exclude arguments, output, stderr, and upstream errors', async (t) => {
	const captured = captureSteps(t)
	t.mock.method(console, 'info', (message: string) => {
		captured.titles.push(message)
	})
	let scenario: { error: ExecException | null; stdout: string; stderr: string; throws?: boolean } = {
		error: null,
		stdout: '',
		stderr: '',
	}
	const exec = t.mock.method(
		childProcess,
		'exec',
		(_command: string, callback: (error: ExecException | null, stdout: string, stderr: string) => void) => {
			if (scenario.throws) throw new Error(secret)
			callback(scenario.error, scenario.stdout, scenario.stderr)
		}
	)
	syncBuiltinESMExports()
	t.after(() => {
		exec.mock.restore()
		syncBuiltinESMExports()
	})
	const cli = new SalesforceCliHandler()
	const command = { command: `synthetic ${secret}`, flags: ['--json', clientId], log: true }
	for (const next of [
		{
			error: Object.assign(new Error(secret), { code: 2 }),
			stdout: secret,
			stderr: clientId,
			expected: 'Salesforce CLI execution failed (exit code 2)',
		},
		{
			error: Object.assign(new Error(secret), { code: 0 }),
			stdout: secret,
			stderr: clientId,
			expected: 'Salesforce CLI execution failed (exit code 0)',
		},
		{ error: new Error(secret), stdout: secret, stderr: clientId, expected: 'Salesforce CLI execution failed' },
		{ error: null, stdout: secret, stderr: '', expected: 'failed parsing Salesforce CLI JSON output' },
		{ error: null, stdout: secret, stderr: clientId, expected: 'Salesforce CLI reported an error on stderr' },
		{ error: null, stdout: '', stderr: '', expected: 'missing output from Salesforce CLI command' },
		{ error: null, stdout: '', stderr: '', throws: true, expected: 'failed starting Salesforce CLI command' },
	]) {
		scenario = next
		await assert.rejects(cli.runCommand(command), (error: unknown) => {
			captured.errors.push(error)
			return error instanceof Error && error.message === next.expected
		})
	}
	scenario = { error: null, stdout: JSON.stringify({ accessToken: secret }), stderr: '' }
	assert.deepEqual(await cli.runCommand(command), { accessToken: secret })
	scenario = { error: null, stdout: secret, stderr: 'deprecation warning' }
	assert.equal(await cli.runCommand({ command: 'synthetic', log: true }), secret)
	assertSafe(captured)
})
