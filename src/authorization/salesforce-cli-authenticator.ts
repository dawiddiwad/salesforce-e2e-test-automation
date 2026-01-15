import { expect, Page } from '@playwright/test'
import { RestApiHandler } from '../api/salesforce/rest-api-handler'
import { SalesforceCliHandler } from '../cli/salesforce-cli-handler'
import { step } from '../../test/runners/custom-test-runner'

export type TargetOrg = {
	status: number
	result: {
		id: string
		apiVersion: string
		accessToken: string
		instanceUrl: string
		username: string
		clientId: string
		connectedStatus: string
		sfdxAuthUrl: string
		alias: string
	}
	warnings: string[]
}

export type Context = {
	api: RestApiHandler
	ui: Page
}

export class SalesforceCliAuthenticator {
	private readonly cli: SalesforceCliHandler
	private targetOrg!: TargetOrg
	ready: Promise<this>

	constructor(cliHandler: SalesforceCliHandler) {
		this.cli = cliHandler
		this.ready = this.setTargetOrg().then(() => this)
	}

	private async setTargetOrg() {
		this.targetOrg = (await this.cli.runCommand({
			command: 'org display',
			flags: ['--verbose', '--json'],
		})) as TargetOrg
		expect(this.targetOrg.result.connectedStatus, 'the default target org should be connected').toBe('Connected')
	}

	private getAccessToken(): string {
		return this.targetOrg.result.accessToken
	}

	public getInstanceUrl(): URL {
		return new URL(this.targetOrg.result.instanceUrl)
	}

	@step
	async authenticateApi(): Promise<RestApiHandler> {
		try {
			return await new RestApiHandler({
				accessToken: this.getAccessToken(),
				instanceUrl: this.getInstanceUrl(),
			}).ready
		} catch (error) {
			throw new Error(`failed authenticating api context due to:\n${error}`)
		}
	}

	@step
	async authenticateUi(page: Page): Promise<Page> {
		try {
			await page.context().addCookies([
				{
					name: 'sid',
					value: this.getAccessToken(),
					url: this.getInstanceUrl().toString(),
				},
			])
			return page
		} catch (error) {
			throw new Error(`failed authenticating ui context due to:\n${error}`)
		}
	}
}
