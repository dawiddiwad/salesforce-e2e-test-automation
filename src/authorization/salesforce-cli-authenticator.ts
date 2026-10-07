import { Page } from '@playwright/test'
import { RestApiHandler } from '../api/salesforce/rest-api-handler'
import { SalesforceCliHandler } from '../cli/salesforce-cli-handler'
import { step } from '../runners/step'
import { diagnostic, secrets } from '../errors/redaction'

export type TargetOrg = {
	status: number
	result: {
		id: string
		apiVersion: string
		accessToken?: string
		instanceUrl: string
		username: string
		clientId: string
		connectedStatus: string
		sfdxAuthUrl: string
		alias: string
	}
	warnings: string[]
}

export type AccessCredentials = {
	status: number
	result: {
		accessToken: string
	}
	warnings: string[]
}

export type Context = {
	api: RestApiHandler
	ui: Page
}

export class SalesforceCliAuthenticator {
	private static process: Promise<SalesforceCliAuthenticator> | undefined
	private readonly cli: SalesforceCliHandler
	private targetOrg!: TargetOrg
	private accessCredentials!: AccessCredentials
	ready: Promise<this>

	/**
	 * Resolves the authenticator shared by everything in the current process.
	 *
	 * Org metadata and the access token require separate CLI calls and are invariant for the
	 * lifetime of a run. Playwright workers are separate processes, so this memo resolves both
	 * once per worker rather than once per fixture per test.
	 *
	 * A failed lookup is not cached — the next caller retries rather than inheriting the failure.
	 */
	static shared(cliHandler: SalesforceCliHandler = new SalesforceCliHandler()): Promise<SalesforceCliAuthenticator> {
		if (!SalesforceCliAuthenticator.process) {
			SalesforceCliAuthenticator.process = new SalesforceCliAuthenticator(cliHandler).ready.catch(
				(error: unknown) => {
					SalesforceCliAuthenticator.process = undefined
					throw error
				}
			)
		}
		return SalesforceCliAuthenticator.process
	}

	constructor(cliHandler: SalesforceCliHandler) {
		this.cli = cliHandler
		this.ready = (async () => {
			try {
				await this.setTargetOrg()
				await this.setAccessCredentials()
				return this
			} catch (error: unknown) {
				throw diagnostic('failed loading connected Salesforce CLI target org', error)
			}
		})()
	}

	private async setTargetOrg() {
		this.targetOrg = (await this.cli.runCommand({
			command: 'org display',
			flags: ['--verbose', '--json'],
		})) as TargetOrg
		this.registerCredentials()
		if (this.targetOrg.result.connectedStatus !== 'Connected') {
			throw new Error('the default Salesforce CLI target org is not connected')
		}
	}

	private async setAccessCredentials() {
		this.accessCredentials = (await this.cli.runCommand({
			command: 'org auth show-access-token',
			flags: ['--json'],
		})) as AccessCredentials
		this.registerCredentials()
		if (!this.accessCredentials.result.accessToken) {
			throw new Error('failed to retrieve default org access token from Salesforce CLI')
		}
	}

	/**
	 * Registers credentials returned by the org metadata and access-token commands, so any of
	 * them appearing in a downstream error is masked before it reaches a report.
	 *
	 * This is the point that makes cause preservation safe elsewhere in the framework — it runs
	 * before each response is checked, so failed initialization is still covered.
	 */
	private registerCredentials(): void {
		secrets.register(
			this.accessCredentials?.result?.accessToken,
			this.targetOrg.result?.accessToken,
			this.targetOrg.result?.sfdxAuthUrl,
			this.targetOrg.result?.clientId
		)
	}

	private getAccessToken(): string {
		return this.accessCredentials.result.accessToken
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
			throw diagnostic('failed authenticating Salesforce API context', error)
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
			throw diagnostic('failed authenticating Salesforce UI context', error)
		}
	}
}
