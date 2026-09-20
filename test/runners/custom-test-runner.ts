import { mergeTests, test as base } from '@playwright/test'
import { allEmailServices, allSalesforceServices, EmailServices, SalesforceServices } from '../models/services'
import { SalesforcePages, allSalesforcePages } from '../models/pages'
import { SalesforceServiceObjectModel, EmailServiceObjectModel } from '../../src/models/services/types'
import { SalesforcePageObjectModel } from '../../src/models/pages/types'
import { DefaultSalesforceCliUser } from '../../src/users/default-salesforce-cli-users'
import { SalesforceCliAuthenticator } from '../../src/authorization/salesforce-cli-authenticator'
import { RestApiHandler } from '../../src/api/salesforce/rest-api-handler'

type SalesforceWorkerFixtures = {
	authenticator: SalesforceCliAuthenticator
	salesforceApi: RestApiHandler
}

/**
 * Authentication is resolved once per worker, not once per fixture per test.
 *
 * Both steps are worker-invariant: `sf org display` costs a process spawn, and the jsforce
 * identity round trip that validates the resulting token costs a request. Previously `ui`,
 * `api` and `actor` each built their own user, so a test declaring `{ ui, api }` paid for two
 * CLI invocations and a test declaring `{ actor, ui, api }` paid for three.
 *
 * Session scope is safe here: the token is valid for far longer than a worker's lifetime, and
 * every test in a worker authenticates as the same Salesforce CLI target user regardless.
 */
const withSalesforceAuth = base.extend<object, SalesforceWorkerFixtures>({
	authenticator: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			await use(await SalesforceCliAuthenticator.shared())
		},
		{ scope: 'worker' },
	],
	salesforceApi: [
		async ({ authenticator }, use) => {
			await use(await authenticator.authenticateApi())
		},
		{ scope: 'worker' },
	],
})

/**
 * The Salesforce user for a single test: the worker's API context, plus this test's page
 * authenticated and parked on the target org.
 */
const testSalesforceDefaultActor = withSalesforceAuth.extend<{ actor: DefaultSalesforceCliUser }>({
	actor: async ({ page, authenticator, salesforceApi }, use) => {
		const user = await new DefaultSalesforceCliUser(authenticator).ready
			.then((actor) => actor.setApi(salesforceApi))
			.then((actor) => actor.setUi(page))
		await use(user)
	},
})

const testSalesforceUiCatalog = testSalesforceDefaultActor.extend<SalesforcePageObjectModel<SalesforcePages>>({
	ui: async ({ actor }, use) => {
		await use({ ...allSalesforcePages(actor.ui) })
	},
})

/** Deliberately does not depend on `actor`: an API-only test must not start a browser. */
const testSalesforceApiCatalog = withSalesforceAuth.extend<SalesforceServiceObjectModel<SalesforceServices>>({
	api: async ({ salesforceApi }, use) => {
		await use({ ...allSalesforceServices(salesforceApi) })
	},
})

const testEmailApiCatalog = base.extend<EmailServiceObjectModel<EmailServices>>({
	// eslint-disable-next-line no-empty-pattern
	email: async ({}, use) => {
		await use({ ...allEmailServices() })
	},
})

export const test = mergeTests(
	testSalesforceUiCatalog,
	testSalesforceApiCatalog,
	testSalesforceDefaultActor,
	testEmailApiCatalog
)
