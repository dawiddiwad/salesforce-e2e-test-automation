import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { ServiceCatalog } from '../../types/tab-builder'
import { ItineraryCostingsLinePage } from './costings-line-page'
import { ItineraryPriceLinePage } from './price-line-page'
import { PriceLinesRow as PriceLinesType } from '../../types/tab-costings'

export class ItineraryCostingsTabPage extends SalesforcePage {
	private readonly filtersPanel = {
		container: this.page.locator('.PackageNamespaceCommonFilterPanel'),
		openButton: this.page.getByTitle('Settings', { exact: true }),
		closeButton: this.page.getByTitle('Close', { exact: true }),
		applyButton: this.page.getByTitle('Apply'),
		recordTypeButton: this.page.locator('//button[@data-value="All Record Types"]'),
	}

	private readonly checkbox = {
		lockSellPrice: this.page
			.locator('article.PackageNamespaceItineraryCostings')
			.locator("//label[.='Lock Sell Price']//span[@class='slds-checkbox_faux_container']"),
	}

	@step
	async getLockSellPriceState() {
		return this.checkbox.lockSellPrice.isChecked()
	}

	@step
	async unlockSellPrice() {
		if (!(await this.getLockSellPriceState())) return
		else return this.toggleLockSellPrice()
	}

	@step
	async lockSellPrice() {
		if (await this.getLockSellPriceState()) return
		else return this.toggleLockSellPrice()
	}

	@step
	async toggleLockSellPrice() {
		const initialState = await this.getLockSellPriceState()
		await this.checkbox.lockSellPrice.check()
		expect(this.checkbox.lockSellPrice.isChecked, 'Lock Sell Price checkbox was toggled').not.toBe(initialState)
	}

	@step
	async getCostingsLine(number: number): Promise<ItineraryCostingsLinePage> {
		return new ItineraryCostingsLinePage(this.page, --number).ready
	}

	@step
	async getPriceLine(type: PriceLinesType) {
		switch (type) {
			case 'Amount':
				return new ItineraryPriceLinePage(this.page, 0).ready
			case 'Tax Amount':
				return new ItineraryPriceLinePage(this.page, 1).ready
		}
	}

	@step
	async filterLinesByRecordType<Type extends keyof ServiceCatalog>(record: Type) {
		await this.filtersPanel.openButton.click()
		await this.filtersPanel.recordTypeButton.click()
		await this.page.getByText(record, { exact: true }).click()
		await this.filtersPanel.applyButton.click()
		await expect(this.filtersPanel.container, 'filters panel should be hidden').toBeHidden()
	}
}
