import assert from 'node:assert/strict'
import { test } from 'node:test'
import { test as reportingTest } from '@playwright/test'
import { SalesforceCliHandler, type CliCommand } from '../../src/cli/salesforce-cli-handler'
import { SalesforceCliAuthenticator } from '../../src/authorization/salesforce-cli-authenticator'
import { DefaultSalesforceCliUser } from '../../src/users/default-salesforce-cli-users'

const connectedOrg = {
	result: {
		connectedStatus: 'Connected',
		instanceUrl: 'https://example.invalid',
	},
}

const accessCredentials = { result: { accessToken: 'synthetic-shared-access-token' } }
const authenticationCommands = [
	{ command: 'org display', flags: ['--verbose', '--json'] },
	{ command: 'org auth show-access-token', flags: ['--json'] },
]

async function authenticationResponse(command: CliCommand) {
	if (command.command === 'org display') {
		assert.deepEqual(command, authenticationCommands[0])
		return connectedOrg
	}
	assert.deepEqual(command, authenticationCommands[1])
	return accessCredentials
}

/** Clears the process-level memo between cases without exposing a production-only seam. */
function resetSharedAuthenticator() {
	;(SalesforceCliAuthenticator as unknown as { process: undefined }).process = undefined
}

test('shared() resolves org metadata and access credentials once per process', async (t) => {
	resetSharedAuthenticator()
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', authenticationResponse)

	const resolved = await Promise.all([
		SalesforceCliAuthenticator.shared(),
		SalesforceCliAuthenticator.shared(),
		SalesforceCliAuthenticator.shared(),
	])

	assert.deepEqual(
		runCommand.mock.calls.map((call) => call.arguments[0]),
		authenticationCommands
	)
	assert.equal(new Set(resolved).size, 1)
	assert.equal(resolved[0].getInstanceUrl().origin, 'https://example.invalid')
})

test('users constructed without an authenticator reuse the shared one', async (t) => {
	resetSharedAuthenticator()
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', authenticationResponse)

	await Promise.all([
		new DefaultSalesforceCliUser().ready,
		new DefaultSalesforceCliUser().ready,
		new DefaultSalesforceCliUser().ready,
	])

	assert.deepEqual(
		runCommand.mock.calls.map((call) => call.arguments[0]),
		authenticationCommands
	)
})

test('an injected authenticator bypasses the shared lookup entirely', async (t) => {
	resetSharedAuthenticator()
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', authenticationResponse)

	const authenticator = await SalesforceCliAuthenticator.shared()
	runCommand.mock.resetCalls()
	await new DefaultSalesforceCliUser(authenticator).ready

	assert.equal(runCommand.mock.callCount(), 0)
})

test('a failed lookup is not cached, so the next caller retries', async (t) => {
	resetSharedAuthenticator()
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	let attempt = 0
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async (command: CliCommand) => {
		attempt += 1
		if (attempt === 1) throw new Error('no authorization information found')
		return authenticationResponse(command)
	})

	await assert.rejects(SalesforceCliAuthenticator.shared(), {
		message: 'failed loading connected Salesforce CLI target org',
	})
	assert.ok(await SalesforceCliAuthenticator.shared())
	assert.deepEqual(
		runCommand.mock.calls.map((call) => call.arguments[0]),
		[authenticationCommands[0], ...authenticationCommands]
	)
})

test('a failed access-token lookup is not cached, so the next caller retries both commands', async (t) => {
	resetSharedAuthenticator()
	let tokenAttempts = 0
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async (command: CliCommand) => {
		if (command.command === 'org auth show-access-token' && ++tokenAttempts === 1) {
			throw new Error('access token unavailable')
		}
		return authenticationResponse(command)
	})

	await assert.rejects(SalesforceCliAuthenticator.shared(), (error: unknown) => {
		assert.ok(error instanceof Error)
		assert.equal(error.message, 'failed loading connected Salesforce CLI target org')
		assert.ok(error.cause instanceof Error)
		assert.equal(error.cause.message, 'access token unavailable')
		return true
	})
	assert.ok(await SalesforceCliAuthenticator.shared())
	assert.deepEqual(
		runCommand.mock.calls.map((call) => call.arguments[0]),
		[...authenticationCommands, ...authenticationCommands]
	)
})

test('a missing access token rejects initialization', async (t) => {
	t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async ({ command }: CliCommand) =>
		command === 'org display' ? connectedOrg : { result: { accessToken: '' } }
	)

	await assert.rejects(new SalesforceCliAuthenticator(new SalesforceCliHandler()).ready, (error: unknown) => {
		assert.ok(error instanceof Error)
		assert.equal(error.message, 'failed loading connected Salesforce CLI target org')
		assert.ok(error.cause instanceof Error)
		assert.equal(error.cause.message, 'failed to retrieve default org access token from Salesforce CLI')
		return true
	})
})
