import { Page, expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../runners/custom-test-runner'
import { PriceCategory } from '../../../types/tab-builder'
import { Quote } from '../../../types/quote'

export class PriceCategoriesPopover extends SalesforcePage {
	private readonly quote: Quote
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.quote = new Quote()
		this.ready = expect(this.popover, `Price Categories popover should be visible`)
			.toBeVisible()
			.then(() => this)
	}

	private readonly popover = this.page.getByRole('dialog').filter({ hasText: 'Price Categories' })
	private readonly heading = this.popover.getByRole('heading')
	private readonly dropdownPriceCategory = this.popover
		.locator('c-lwc-pseudo-combobox-input')
		.filter({ hasText: 'Price Category:' })
		.getByRole('textbox')
	private readonly selectMealPlan = this.popover
		.locator('c-lwc-pseudo-combobox-input')
		.filter({ hasText: 'Meal Plan:' })
		.getByRole('textbox')
	private readonly option = this.page.getByRole('menuitem')
	private readonly buttonApply = this.popover.getByRole('button', { name: 'Apply' })
	private readonly buttonClose = this.popover.getByRole('button', { name: 'close Close' })

	@step
	async getAvailablePriceCategories() {
		const categories: PriceCategory[] = []
		await this.dropdownPriceCategory.click()
		await this.waitForOptionalSpinners()
		for (const option of await this.option.all()) {
			const name = await option.locator('.option-name').innerText()
			const info = option.locator('.additional-info')
			const getPrice = async () => this.quote.getPrice(await info.innerText())
			await expect(getPrice, `${name} category should have price visible`).toPass()
			categories.push({
				name: name,
				price: await getPrice(),
			})
		}
		return categories
	}

	@step
	async setPriceCategory(name: string) {
		await this.heading.click()
		await this.dropdownPriceCategory.click()
		await this.option.filter({ hasText: name }).click()
		await expect(this.dropdownPriceCategory, `${name} should be set on Price Categories popover`).toHaveValue(name)
	}

	@step
	async applyChanges() {
		await this.buttonApply.click()
		await this.waitForOptionalSpinners()
		await expect(this.popover, 'Price Categories popover should be closed').not.toBeVisible()
	}

	@step
	async close() {
		await this.buttonClose.click()
		await expect(this.popover, 'Price Categories should be closed').not.toBeVisible()
	}
}
