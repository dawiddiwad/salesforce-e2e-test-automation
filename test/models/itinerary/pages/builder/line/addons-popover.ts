import { Page, expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../runners/custom-test-runner'
import { AddOn } from '../../../types/tab-builder'
import { Quote } from '../../../types/quote'

export class AddOnsPopover extends SalesforcePage {
	private readonly quote: Quote
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.quote = new Quote()
		this.ready = expect(this.popover, `Add-Ons popover should be visible`)
			.toBeVisible()
			.then(() => this)
	}

	private readonly popover = this.page.getByRole('dialog').filter({ hasText: 'Add-Ons' })
	private readonly heading = this.popover.getByRole('heading')
	private readonly dropdownSelectAddOn = this.popover.getByRole('textbox', { name: 'Select an Add-On' })
	private readonly addOnSelectedByName = (name: string) =>
		this.popover.locator('table').locator(`//tr[descendant::*[@scope='row'] and descendant::*[text()='${name}']]`)
	private readonly addOnSelected = this.popover.locator('table').locator("//tr[descendant::*[@scope='row']]")
	private readonly option = this.page.getByRole('menuitem')
	private readonly buttonApply = this.popover.getByRole('button', { name: 'Apply' })
	private readonly buttonClose = this.popover.getByRole('button', { name: 'close Close' })

	@step
	async getAvailableAddOns() {
		const addOns: AddOn[] = []
		await this.dropdownSelectAddOn.click()
		await this.waitForOptionalSpinners()
		for (const option of await this.option.all()) {
			const name = await option.locator('.option-name').innerText()
			const info = option.locator('.additional-info')
			const getPrice = async () => this.quote.getPrice(await info.innerText())
			await expect(getPrice, `${name} addon should have price visible`).toPass()
			addOns.push({
				name: name,
				price: await getPrice(),
				startDate: '',
				endDate: '',
			})
		}
		return addOns
	}

	@step
	async selectAddOn(name: string) {
		await this.heading.click()
		await this.dropdownSelectAddOn.click()
		await this.option.getByTitle(name, { exact: true }).click()
		await expect(this.addOnSelectedByName(name), `${name} Add-On should be set on Add-Ons popover`).toBeVisible()
	}

	@step
	async deleteAddOn(name: string) {
		const before = await this.getSelectedAddOns()
		await this.heading.click()
		await this.addOnSelectedByName(name).locator("button:has([data-key='delete'])").click()
		const after = await this.getSelectedAddOns()
		const removedAddOns = before.filter(
			(beforeItem) => !after.some((afterItem) => afterItem.name === beforeItem.name)
		)
		expect(removedAddOns, 'only one Add-On should be removed').toHaveLength(1)
		expect(removedAddOns[0].name, `${name} Add-On should be removed`).toEqual(name)
	}

	@step
	async getSelectedAddOns() {
		const addOns: AddOn[] = []
		await this.waitForOptionalSpinners()
		for (const selected of await this.addOnSelected.all()) {
			addOns.push({
				name: await selected.locator('th').first().textContent(),
				startDate: await selected.locator('td').nth(0).textContent(),
				endDate: await selected.locator('td').nth(1).textContent(),
				price: this.quote.getPrice((await selected.locator('td').nth(2).textContent()) as string),
			} as AddOn)
		}
		return addOns
	}

	@step
	async applyChanges() {
		await this.buttonApply.click()
		await this.waitForOptionalSpinners()
		await expect(this.popover, 'Add-Ons popover should be closed').not.toBeVisible()
	}

	@step
	async close() {
		await this.buttonClose.click()
		await expect(this.popover, 'Add-Ons popover should be closed').not.toBeVisible()
	}
}
