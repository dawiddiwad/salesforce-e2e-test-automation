import assert from 'node:assert/strict'
import { test } from 'node:test'
import { test as reportingTest } from '@playwright/test'
import { SalesforceCliHandler } from '../../src/cli/salesforce-cli-handler'
import { SalesforceCliAuthenticator } from '../../src/authorization/salesforce-cli-authenticator'
import { DefaultSalesforceCliUser } from '../../src/users/default-salesforce-cli-users'

const connectedOrg = {
	result: {
		connectedStatus: 'Connected',
		accessToken: 'synthetic-shared-access-token',
		instanceUrl: 'https://example.invalid',
	},
}

/** Clears the process-level memo between cases without exposing a production-only seam. */
function resetSharedAuthenticator() {
	;(SalesforceCliAuthenticator as unknown as { process: undefined }).process = undefined
}

test('shared() resolves one Salesforce CLI invocation per process', async (t) => {
	resetSharedAuthenticator()
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async () => connectedOrg)

	const resolved = await Promise.all([
		SalesforceCliAuthenticator.shared(),
		SalesforceCliAuthenticator.shared(),
		SalesforceCliAuthenticator.shared(),
	])

	assert.equal(runCommand.mock.callCount(), 1)
	assert.equal(new Set(resolved).size, 1)
	assert.equal(resolved[0].getInstanceUrl().origin, 'https://example.invalid')
})

test('users constructed without an authenticator reuse the shared one', async (t) => {
	resetSharedAuthenticator()
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async () => connectedOrg)

	await Promise.all([
		new DefaultSalesforceCliUser().ready,
		new DefaultSalesforceCliUser().ready,
		new DefaultSalesforceCliUser().ready,
	])

	assert.equal(runCommand.mock.callCount(), 1)
})

test('an injected authenticator bypasses the shared lookup entirely', async (t) => {
	resetSharedAuthenticator()
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async () => connectedOrg)

	const authenticator = await SalesforceCliAuthenticator.shared()
	runCommand.mock.resetCalls()
	await new DefaultSalesforceCliUser(authenticator).ready

	assert.equal(runCommand.mock.callCount(), 0)
})

test('a failed lookup is not cached, so the next caller retries', async (t) => {
	resetSharedAuthenticator()
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	let attempt = 0
	const runCommand = t.mock.method(SalesforceCliHandler.prototype, 'runCommand', async () => {
		attempt += 1
		if (attempt === 1) throw new Error('no authorization information found')
		return connectedOrg
	})

	await assert.rejects(SalesforceCliAuthenticator.shared(), {
		message: 'failed loading connected Salesforce CLI target org',
	})
	assert.ok(await SalesforceCliAuthenticator.shared())
	assert.equal(runCommand.mock.callCount(), 2)
})
