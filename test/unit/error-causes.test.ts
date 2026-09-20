import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import type { Page } from '@playwright/test'
import { test as reportingTest } from '../runners/custom-test-runner'
import { SalesforcePage } from '../../src/models/pages/salesforce-page'

beforeEach((t) => {
	assert.ok('mock' in t)
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
})

class BeaconPage extends SalesforcePage {
	waitForBeacon() {
		return this.salesforcePerformanceBeacon()
	}
}

test('beacon wrapper retains the original error and its existing cause', async () => {
	const root = new Error('response transport failed')
	const original = new Error('response did not finish', { cause: root })
	const page = {
		waitForResponse: async () => ({
			finished: async () => {
				throw original
			},
		}),
	} as unknown as Page
	await assert.rejects(new BeaconPage(page).waitForBeacon(), (error: unknown) => {
		assert.ok(error instanceof Error)
		assert.equal(error.message, 'waiting for Salesforce Instrumentation Beacon request')
		assert.equal(error.cause, original)
		assert.equal(original.cause, root)
		return true
	})
})
