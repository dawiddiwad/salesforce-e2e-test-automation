import { Page } from '@playwright/test'
import { RestApiHandler } from '../api/salesforce/rest-api-handler'

export interface SalesforceFrontendUser {
	ui: Page
	setUi(context: Page): Promise<this>
}

export interface SalesforceBackendUser {
	api: RestApiHandler
	setApi(context: RestApiHandler): Promise<this>
}
