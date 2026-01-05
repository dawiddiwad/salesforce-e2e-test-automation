import { expect } from '@playwright/test'
import { test } from '../../runners/custom-test-runner'

test.describe.parallel('demo suite', async () => {
	test('ui smoke test', { tag: ['@TA-001'] }, async ({ ui }) => {
		await ui.navigator.openApp('Sales')
		await ui.navigator.openTab('Accounts')
		await ui.navigator.openApp('Service')
		await ui.navigator.openTab('Cases')
	})

	test('api smoke test', { tag: ['@TA-002'] }, async ({ api }) => {
		const dataStorage = await api.limits.getRemainingDataStorageMB()
		expect(dataStorage).toBeDefined()
	})

	test('actor smoke test', { tag: ['@TA-003'] }, async ({ actor }) => {
		const sessionIdCookie = (await actor.ui.context().cookies()).find((cookie) => cookie.name === 'sid')
		expect(sessionIdCookie).toBeDefined()
	})
})
