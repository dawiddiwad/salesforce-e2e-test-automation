import assert from 'node:assert/strict'
import { inspect } from 'node:util'
import { test, type TestContext } from 'node:test'
import { test as playwrightTest } from '@playwright/test'
import { step } from '../../src/runners/step'
import { RestApiHandler, EmptyQueryResultError } from '../../src/api/salesforce/rest-api-handler'
import childProcess, { type ExecException } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { Connection } from 'jsforce'
import type { Page } from '@playwright/test'
import { SalesforceCliHandler, type CliCommand } from '../../src/cli/salesforce-cli-handler'
import { SalesforceCliAuthenticator } from '../../src/authorization/salesforce-cli-authenticator'
import { DefaultSalesforceCliUser } from '../../src/users/default-salesforce-cli-users'
import { secrets } from '../../src/errors/redaction'

const secret = 'synthetic-client-secret-do-not-log'
const clientId = 'synthetic-client-id-do-not-log'
const source = `String clientSecret = '${secret}';`

/**
 * In a real run these are registered by `SalesforceCliAuthenticator.registerCredentials` and
 * the `RestApiHandler` constructor. Several tests here build handlers via `Object.create` to
 * bypass construction, so registration is done explicitly for the whole file.
 */
secrets.register(secret, clientId)
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

/**
 * Asserts that no registered credential reaches a reportable artifact — step titles, thrown
 * messages, retained causes, or any stack within them.
 *
 * Causes are deliberately *not* asserted to be absent: the framework propagates them so that
 * failures stay debuggable. What must hold is that they are credential-free.
 */
function assertSafe(captured: { titles: string[]; errors: unknown[] }) {
	const artifacts = inspect(captured, { depth: null })
	assert.ok(!artifacts.includes(secret), 'registered secret reached a reportable artifact')
	assert.ok(!artifacts.includes(clientId), 'registered client id reached a reportable artifact')
	assert.ok(!artifacts.includes(source), 'Apex source reached a reportable artifact')
	for (const error of captured.errors) {
		assert.ok(error instanceof Error)
	}
}

/** Asserts the upstream diagnostic survived wrapping, so a failure remains debuggable. */
function assertCausePreserved(error: unknown, expectedMessage: string) {
	assert.ok(error instanceof Error)
	assert.equal(error.message, expectedMessage)
	assert.ok(error.cause instanceof Error, `${expectedMessage} must retain its upstream cause`)
	return true
}

test('step titles render arguments without changing receiver, arguments, or return value', async (t) => {
	const captured = captureSteps(t)
	const result = { tab: 'Builder' }
	const args = ['Builder', ['Europe', 'Asia'], { type: 'Quote' }, undefined]
	class Example {
		@step
		async openTab(...received: unknown[]) {
			assert.equal(this, example)
			assert.deepEqual(received, args)
			return result
		}
	}
	const example = new Example()
	assert.equal(await example.openTab(...args), result)
	assert.deepEqual(captured.titles, ['Example > Open Tab : Builder, [Europe, Asia], {\n  "type": "Quote"\n}, any'])
})

test('step titles mask registered credentials passed as arguments', async (t) => {
	const captured = captureSteps(t)
	class Example {
		@step
		async authenticate(...received: unknown[]) {
			assert.equal(received.length, 2)
			return 'ok'
		}
	}
	assert.equal(await new Example().authenticate(secret, { clientSecret: secret, user: clientId }), 'ok')
	assertSafe(captured)
})

test('an unserializable argument degrades instead of failing the step it describes', async (t) => {
	const captured = captureSteps(t)
	const cyclic: { self?: object; name: string } = { name: 'itinerary' }
	cyclic.self = cyclic
	class Example {
		@step
		async accept(...received: unknown[]) {
			assert.equal(received.length, 2)
			return 'ok'
		}
	}
	assert.equal(
		await new Example().accept(cyclic, {
			toJSON: () => {
				throw new Error('refuses to serialize')
			},
		}),
		'ok'
	)
	assert.equal(captured.titles.length, 1)
	assert.match(captured.titles[0], /^Example > Accept : \[object Object\], \[object Object\]$/)
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

test('executeApex forwards source and reports it with registered credentials masked', async (t) => {
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
	assert.deepEqual(captured.titles, [`RestApiHandler > Execute Apex : String clientSecret = '«redacted»';`])
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

test('executeApex rejects untrusted metadata and retains a redacted transport cause', async (t) => {
	const captured = captureSteps(t)
	await assert.rejects(
		handlerWith({
			tooling: {
				executeAnonymous: async () => ({ success: false, compiled: secret, line: secret, column: clientId }),
			},
		}).executeApex(source),
		(error: unknown) => {
			assert.ok(error instanceof Error)
			assert.equal(error.message, 'failed executing anonymous Apex')
			assert.equal(error.cause, undefined)
			return true
		}
	)
	await assert.rejects(
		handlerWith({
			tooling: {
				executeAnonymous: async () => {
					throw new Error(source, { cause: new Error(`upstream ${clientId} reset`) })
				},
			},
		}).executeApex(source),
		(error: unknown) => {
			assertCausePreserved(error, 'failed executing anonymous Apex')
			const cause = (error as Error).cause as Error
			assert.ok(cause.cause instanceof Error, 'nested cause chain must survive')
			assert.match(cause.cause.message, /upstream .* reset/, 'non-credential text must survive')
			return true
		}
	)
	assertSafe(captured)
})

test('update forwards payload on success and redacts credentials in the retained cause', async (t) => {
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
	await assert.rejects(failingHandler.update('Account', payload), (error: unknown) =>
		assertCausePreserved(error, 'unable to update Salesforce record')
	)
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

test('CRUD failures retain a redacted upstream cause', async (t) => {
	const captured = captureSteps(t)
	const fail = async () => {
		throw new Error(`FIELD_CUSTOM_VALIDATION_EXCEPTION ${secret}: ${clientId}`)
	}
	const handler = handlerWith({ create: fail, retrieve: fail, delete: fail })
	for (const [operation, message] of [
		[() => handler.create('Account', { Secret__c: secret }), 'unable to create Salesforce record'],
		[() => handler.read('Account', secret), 'unable to read Salesforce record'],
		[() => handler.delete('Account', secret), 'unable to delete Salesforce record'],
	] as const) {
		await assert.rejects(operation(), (error: unknown) => {
			assertCausePreserved(error, message)
			assert.match(((error as Error).cause as Error).message, /FIELD_CUSTOM_VALIDATION_EXCEPTION/)
			return true
		})
	}
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

test('REST identity failures redact credentials in both asynchronous and synchronous errors', async (t) => {
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

test('authenticator and default user redact target org, API, and cookie failures', async (t) => {
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
	runCommand.mock.mockImplementation(async ({ command }: CliCommand) =>
		command === 'org display'
			? { result: { connectedStatus: 'Connected', instanceUrl: 'https://example.invalid' } }
			: { result: { accessToken: secret } }
	)
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
	t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async ({ command }: CliCommand) =>
		command === 'org display'
			? {
					result: {
						connectedStatus: 'Connected',
						accessToken: 'synthetic-outdated-display-token',
						instanceUrl: 'https://example.invalid',
					},
				}
			: { result: { accessToken: secret } }
	)
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

test('org credentials are registered before connection checks or access-token failures', async (t) => {
	for (const connectedStatus of ['Disconnected', 'Connected']) {
		const credentials = {
			accessToken: `synthetic-display-token-${connectedStatus}`,
			sfdxAuthUrl: `synthetic-auth-url-${connectedStatus}`,
			clientId: `synthetic-client-id-${connectedStatus}`,
		}
		const runCommand = t.mock.method(
			SalesforceCliHandler.prototype,
			'runCommand',
			async ({ command }: CliCommand) => {
				if (command === 'org display') return { result: { connectedStatus, ...credentials } }
				throw new Error(`token lookup failed: ${Object.values(credentials).join(' ')}`)
			}
		)

		await assert.rejects(new SalesforceCliAuthenticator(new SalesforceCliHandler()).ready, (error: unknown) => {
			assert.ok(error instanceof Error)
			assert.ok(error.cause instanceof Error)
			assert.equal(
				error.cause.message,
				connectedStatus === 'Connected'
					? 'token lookup failed: «redacted» «redacted» «redacted»'
					: 'the default Salesforce CLI target org is not connected'
			)
			for (const credential of Object.values(credentials)) {
				assert.equal(secrets.redact(credential), '«redacted»')
				assert.ok(!inspect(error, { depth: null }).includes(credential))
			}
			return true
		})
		assert.equal(runCommand.mock.callCount(), connectedStatus === 'Connected' ? 2 : 1)
		runCommand.mock.restore()
	}
})

test('credentials from the access-token command are redacted in downstream failures', async (t) => {
	const captured = captureSteps(t)
	const accessToken = 'synthetic-new-command-access-token'
	t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async ({ command }: CliCommand) =>
		command === 'org display'
			? { result: { connectedStatus: 'Connected', instanceUrl: 'https://example.invalid' } }
			: { result: { accessToken } }
	)
	const auth = await new SalesforceCliAuthenticator(new SalesforceCliHandler()).ready
	const page = {
		context: () => ({
			addCookies: async () => {
				throw new Error(`cookie rejected: ${accessToken}`)
			},
		}),
	} as unknown as Page

	await assert.rejects(auth.authenticateUi(page), (error: unknown) => {
		assert.ok(error instanceof Error)
		assert.equal(error.message, 'failed authenticating Salesforce UI context')
		assert.ok(error.cause instanceof Error)
		assert.equal(error.cause.message, 'cookie rejected: «redacted»')
		return true
	})
	assert.ok(!inspect(captured, { depth: null }).includes(accessToken))
})

test('CLI logs and failures exclude arguments and output while retaining redacted stderr', async (t) => {
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
