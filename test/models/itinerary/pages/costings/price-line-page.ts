import { expect, Locator, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { PriceLinesColumn as PriceLinesColumns } from '../../types/tab-costings'
import { step } from '../../../../runners/custom-test-runner'

export class ItineraryPriceLinePage extends SalesforcePage {
	private readonly lineIndex: number
	readonly ready: Promise<this>

	constructor(page: Page, lineIndex: number) {
		super(page)
		this.lineIndex = lineIndex
		this.ready = expect(this.table.linesServiceRow.nth(lineIndex), `line ${++lineIndex} should be visible`)
			.toBeVisible()
			.then(() => this)
	}

	private readonly container = this.page.locator(
		"//section[@role='dialog' and contains(@class,'PackageNamespaceCostingsEditorPriceLinesModal')]"
	)
	private readonly table = {
		container: this.page.locator('table'),
		headers: this.page.locator('thead th'),
		linesServiceRow: this.page.locator('c-lwc-costings-price-lines-service-row'),
		lineSummary: this.page.locator('.section_line'),
		cell: this.page.locator('td'),
		textInput: this.page.locator('input'),
		saveButton: this.page.getByRole('button', { name: 'Save' }),
		cancelButton: this.page.locator('footer').getByText('Close'),
		confirmClickspot: this.page.getByRole('heading', { name: 'Price Lines' }),
	}

	private readonly checkbox = {
		lockSellPrice: this.container.locator(
			"//label[.='Lock Sell Price']//span[@class='slds-checkbox_faux_container']"
		),
	}

	private async getColumn(column: PriceLinesColumns): Promise<Locator> {
		const table = this.container.locator(this.table.container)
		await table.locator('thead').waitFor({ state: 'visible' })
		const columnIndex = await table
			.locator(this.table.headers)
			.allInnerTexts()
			.then((headers) => headers.findIndex((label) => label.trim().toLowerCase() === column.toLowerCase()))
		if (columnIndex === -1) throw new Error(`column ${column} not found on Price Lines table`)
		return await table
			.locator(this.table.linesServiceRow)
			.nth(this.lineIndex)
			.locator(this.table.cell)
			.nth(columnIndex)
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
		if (initialState) await this.checkbox.lockSellPrice.uncheck()
		else await this.checkbox.lockSellPrice.check()
		expect(this.checkbox.lockSellPrice.isChecked, 'Lock Sell Price checkbox was toggled').not.toBe(initialState)
	}

	@step
	async readColumn(column: PriceLinesColumns) {
		return (await this.getColumn(column)).textContent()
	}

	@step
	async setColumn(column: PriceLinesColumns, amount: number) {
		const supplierCommissions = this.getColumn(column).then((column) => column.locator(this.table.textInput))
		await supplierCommissions.then((input) => input.clear())
		await supplierCommissions.then((input) => input.fill(amount.toString()))
		await this.table.confirmClickspot.click()
		return this
	}

	@step
	async saveAllChanges() {
		await this.table.saveButton.click()
		await expect(this.container, 'Price Lines modal should be closed').toBeHidden()
		return this
	}
}
