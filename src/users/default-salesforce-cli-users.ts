import { Page } from '@playwright/test'
import { RestApiHandler } from '../api/salesforce/rest-api-handler'
import { SalesforceCliAuthenticator } from '../authorization/salesforce-cli-authenticator'
import { SalesforceCliHandler } from '../cli/salesforce-cli-handler'
import { SalesforceBackendUser, SalesforceFrontendUser } from './salesforce-users'
import { step } from '../../test/runners/custom-test-runner'

export class DefaultSalesforceCliUser implements SalesforceBackendUser, SalesforceFrontendUser {
	private authHandler: SalesforceCliAuthenticator
	ready: Promise<this>
	ui: Page
	api: RestApiHandler

	constructor() {
		this.ready = new SalesforceCliAuthenticator(new SalesforceCliHandler()).ready
			.then((authHandler) => {
				this.authHandler = authHandler
				return this
			})
			.catch((error) => {
				throw new Error(`unable to initialize default cli user due to:\n${error}`)
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
