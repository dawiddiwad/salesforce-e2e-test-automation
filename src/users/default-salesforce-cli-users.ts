import { Page } from '@playwright/test'
import { RestApiHandler } from '../api/salesforce/rest-api-handler'
import { SalesforceCliAuthenticator } from '../authorization/salesforce-cli-authenticator'
import { SalesforceBackendUser, SalesforceFrontendUser } from './salesforce-users'
import { step } from '../runners/step'
import { diagnostic } from '../errors/redaction'

export class DefaultSalesforceCliUser implements SalesforceBackendUser, SalesforceFrontendUser {
	private authHandler!: SalesforceCliAuthenticator
	ready: Promise<this>
	ui!: Page
	api!: RestApiHandler

	/**
	 * @param authenticator an already-resolved authenticator to reuse. Omit it and the user
	 * falls back to {@link SalesforceCliAuthenticator.shared}, so repeated construction inside
	 * one worker still costs a single Salesforce CLI invocation.
	 */
	constructor(authenticator?: SalesforceCliAuthenticator | Promise<SalesforceCliAuthenticator>) {
		this.ready = Promise.resolve(authenticator ?? SalesforceCliAuthenticator.shared())
			.then((authHandler) => {
				this.authHandler = authHandler
				return this
			})
			.catch((error: unknown) => {
				throw diagnostic('unable to initialize default Salesforce CLI user', error)
			})
	}

	@step
	private async openTargetOrg() {
		const targetOrgUrl = this.authHandler.getInstanceUrl()
		await this.ui.goto(targetOrgUrl.toString(), { waitUntil: 'commit' })
	}

	async setUi(context: Page): Promise<this> {
		if (context !== this.ui) {
			this.ui = await this.authHandler.authenticateUi(context)
		}
		await this.openTargetOrg()
		return this
	}

	async setApi(context: RestApiHandler | 'default'): Promise<this> {
		if (context === 'default') {
			this.api = await this.authHandler.authenticateApi()
		} else {
			this.api = context
		}
		return this
	}
}
