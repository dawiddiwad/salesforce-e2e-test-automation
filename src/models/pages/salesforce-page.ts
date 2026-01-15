import { expect, Locator, Page } from '@playwright/test'
import { step } from '../../../test/runners/custom-test-runner'

export abstract class SalesforcePage {
	protected readonly page: Page
	protected readonly salesforceIdRegex = /[a-zA-Z0-9]{15,18}/

	protected readonly toast = {
		alert: () => this.page.getByRole('alert').or(this.page.locator('.toastContent')),
	}

	protected readonly spinners = () =>
		this.page
			.locator(
				"//*[contains(@class,'slds-spinner_container') and not(contains(@class,'hidden')) and not(contains(@class,'slds-hide'))]"
			)
			.all()

	constructor(page: Page) {
		this.page = page
	}

	protected getOriginUrl(): string {
		return new URL(this.page.url()).origin
	}

	protected getSalesforceIdFromUrl(): string {
		const url = this.page.url()
		const match = url.match(this.salesforceIdRegex)
		if (match) return match[0]
		else throw Error(`unable to parse Salesforce Id from url ${url}`)
	}

	/**
	 * Waits for the Salesforce 'Instrumentation Beacon' request.
	 *
	 * **Details**
	 *
	 * This method waits until Salesforce sends performance data to the Salesforce backend.
	 * This diagnostic request is triggered when all of the page’s built-in XHRs (XMLHttpRequests) have finished loading.
	 *
	 * **Usage**
	 *
	 * Although this request doesn't directly indicate that page rendering is complete,
	 * it is a strong indicator that most of the page's resources have finished loading.
	 * It is used internally by Salesforce to measure site performance for standard LEX (Lightning Experience) components.
	 *
	 * **Caution**
	 *
	 * Before using this method, ensure that the request is fired every time for the given context.
	 * It may not be fired consistently, and it is not guaranteed to be triggered for all standard LEX components.
	 */
	@step
	protected async salesforcePerformanceBeacon() {
		try {
			await this.page.waitForResponse(/InstrumentationBeacon/).then((response) => response.finished())
		} catch (error) {
			throw new Error(`waiting for Salesforce Instrumentation Beacon request due to\n:${error}`)
		}
	}

	@step
	protected async waitForSpinners(override?: { showupTimeout?: number; disappearTimeout?: number }) {
		await expect(
			async () => expect(await this.spinners()).not.toHaveLength(0),
			'wait for loading spinners to show up'
		).toPass({ timeout: override?.showupTimeout ?? 3 * 60_000 })
		await expect(
			async () => expect(await this.spinners()).toHaveLength(0),
			'wait for loading spinners to disappear'
		).toPass({ timeout: override?.disappearTimeout ?? 3 * 60_000 })
	}

	@step
	protected async waitForOptionalSpinners(override?: { showupTimeout?: number; disappearTimeout?: number }) {
		try {
			await expect(
				async () => expect(await this.spinners()).not.toHaveLength(0),
				'wait for loading spinners to show up'
			).toPass({ timeout: override?.showupTimeout ?? 1000 })
		} catch {
			return
		}
		await expect(
			async () => expect(await this.spinners()).toHaveLength(0),
			'wait for loading spinners to disappear'
		).toPass({ timeout: override?.disappearTimeout ?? 3 * 60_000 })
	}

	@step
	protected async getToastAlerts(locator?: Locator, name?: string) {
		locator = locator ?? this.toast.alert()
		const messages: string[] = []
		for (const alert of await locator.all()) {
			const message = await alert.allInnerTexts()
			if (!message) continue
			else
				messages.push(`
                \n--- ${name ?? 'TOAST'} MESSAGES ---
                \n${message} 
                \n--- ${name ?? 'TOAST'} MESSAGES ---
                \n`)
		}
		return messages.join('\n')
	}
}
