import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../src/models/pages/salesforce-page'
import { SalesforceId } from '../../../../src/models/types'
import { step } from '../../../runners/custom-test-runner'
import { Record } from 'jsforce'
import { App, Tab } from '../types/navigator'

export class NavigatorContextBarPage extends SalesforcePage {
	private readonly button = {
		appLauncher: this.page.getByLabel('App', { exact: true }),
	}

	private readonly item = {
		currentApp: this.page.locator('.appName'),
		tab: (name: Tab) => this.page.getByRole('link', { name: name, exact: true }),
		activeTab: this.page.locator('.navItem.slds-is-active > a'),
	}

	private readonly dialog = {
		appLauncher: {
			panel: this.page.locator('.appLauncherMenu'),
			inputSearch: this.page.getByPlaceholder('Search apps and items...'),
			itemSearchResult: (label: string) => this.page.locator(`//*[@role='option' and @data-label='${label}']`),
		},
	}

	@step
	async goto(resource: SalesforceId | Record) {
		const id = typeof resource === 'string' ? resource : resource.id
		try {
			if (!id.match(this.salesforceIdRegex)) throw new Error(`Id ${id} is not a valid Salesforce Id`)
			await this.page.goto(`${this.getOriginUrl()}/${id}`)
			await this.waitForOptionalSpinners()
			await expect(
				this.page.locator('.record-layout-load-error-container'),
				'record layout should be loaded with no errors'
			).not.toBeVisible()
		} catch (error) {
			throw new Error(`navigating to record id ${id}\n${error}`)
		}
	}

	@step
	async openTab(name: Tab) {
		await this.waitForOptionalSpinners()
		await this.item.tab(name).click()
		await this.waitForOptionalSpinners()
		await expect(this.item.activeTab, `${name} tab is displayed`).toHaveText(name)
	}

	@step
	async openApp(name: App): Promise<void> {
		await this.waitForOptionalSpinners()
		if ((await this.item.currentApp.textContent()) === name) return
		else
			try {
				await this.button.appLauncher.click()
				await this.dialog.appLauncher.inputSearch.clear({ timeout: 3000 })
				await this.dialog.appLauncher.inputSearch.fill(name, { timeout: 3000 })
				await this.dialog.appLauncher.itemSearchResult(name).click({ timeout: 3000 })
			} catch (error) {
				if (error instanceof Error && error.name.includes('TimeoutError')) return this.openApp(name)
				else throw error
			}
		await this.waitForOptionalSpinners()
		await expect(this.item.currentApp, `${name} app should be opened`).toHaveText(name)
	}
}
