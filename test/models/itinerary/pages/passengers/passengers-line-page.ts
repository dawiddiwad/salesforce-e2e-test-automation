import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { PassengersColumn } from '../../types/tab-passengers'
import { step } from '../../../../runners/custom-test-runner'

export class ItineraryPassengersLinePage extends SalesforcePage {
	private readonly lineIndex: number
	readonly ready: Promise<this>

	constructor(page: Page, lineIndex: number) {
		super(page)
		this.lineIndex = lineIndex
		this.ready = expect(this.table.line.nth(lineIndex), `line ${++lineIndex} should be visible`)
			.toBeVisible()
			.then(() => this)
	}

	private readonly frame = this.page
		.getByLabel('Passengers')
		.locator('iframe[title="accessibility title"]')
		.contentFrame()
	private readonly table = {
		headers: this.frame.locator('.ht_master.handsontable thead th'),
		line: this.frame.locator('.ht_master.handsontable tbody tr'),
		cell: this.frame.locator('td'),
	}

	@step
	async get(column: PassengersColumn) {
		const columnIndex = await this.table.headers
			.allTextContents()
			.then((headers) => headers.findIndex((label) => label.trim().toLowerCase().includes(column.toLowerCase())))
		return this.table.line
			.nth(this.lineIndex)
			.locator(this.table.cell)
			.nth(columnIndex - 1)
	}

	@step
	async read(column: PassengersColumn) {
		return (await this.get(column)).textContent()
	}

	@step
	async set(column: PassengersColumn, value: string) {
		await this.get(column).then(async (column) => {
			await column.click({ clickCount: 4 })
			await column.press('Backspace')
			await column.pressSequentially(value)
			await column.press('Enter')
		})
		await expect(await this.get(column), `column ${column} should have value ${value}`).toContainText(value, {
			ignoreCase: true,
		})
	}
}
