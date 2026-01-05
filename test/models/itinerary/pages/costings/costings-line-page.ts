import { expect, Locator, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { CostingsColumn, CostingsPriceColumn } from '../../types/tab-costings'
import { step } from '../../../../runners/custom-test-runner'

export class ItineraryCostingsLinePage extends SalesforcePage {
	private readonly lineIndex: number
	readonly ready: Promise<this>

	constructor(page: Page, lineIndex: number) {
		super(page)
		this.lineIndex = lineIndex
		this.ready = expect(this.costingsEditor.line.nth(lineIndex), `line ${++lineIndex} should be visible`)
			.toBeVisible()
			.then(() => this.waitForOptionalSpinners())
			.then(() => this)
	}

	private readonly costingsEditor = {
		container: this.page.locator('article.PackageNamespaceItineraryCostings'),
		headers: this.page.locator('article.PackageNamespaceItineraryCostings thead th'),
		line: this.page.locator('tr.card'),
		cell: this.page.locator('c-lwc-costings-overview-cell'),
		editPricesButton: this.page.getByTitle('Edit Prices'),
	}

	private readonly priceLinesModal = {
		heading: this.page.getByRole('heading', { name: 'Price Lines' }),
	}

	private async getColumn(column: CostingsColumn): Promise<Locator> {
		await this.costingsEditor.container.waitFor({ state: 'visible' })
		const columnIndex = await this.costingsEditor.headers
			.allTextContents()
			.then((headers) => headers.findIndex((label) => label.trim().toLowerCase().includes(column.toLowerCase())))
		if (columnIndex === -1) throw new Error(`column ${column} not found on Costings Table`)
		return await this.costingsEditor.line.nth(this.lineIndex).locator(this.costingsEditor.cell).nth(columnIndex)
	}

	@step
	async readColumn(column: CostingsColumn) {
		return (await this.getColumn(column)).textContent()
	}

	@step
	async editPriceColumn(column: CostingsPriceColumn) {
		const cell = await this.getColumn(column)
		await cell.locator(this.costingsEditor.editPricesButton).hover({ force: true })
		await cell.locator(this.costingsEditor.editPricesButton).click()
		await expect(this.priceLinesModal.heading, 'Price Lines modal is visible').toBeVisible()
	}
}
