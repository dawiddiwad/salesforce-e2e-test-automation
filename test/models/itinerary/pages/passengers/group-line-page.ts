import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class ItineraryGroupLinePage extends SalesforcePage {
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
		line: this.frame.locator('table').last().locator('tbody tr'),
		groupName: this.frame.getByLabel('Group Name', { exact: true }),
		primaryPassenger: this.frame.locator('select[name="select-primary-passenger"]'),
		otherPassenger: this.frame.locator('.other-passenger-row'),
		deleteButton: this.frame.getByTitle('Delete'),
	}

	@step
	async setGroupName(name: string) {
		await this.table.groupName.nth(this.lineIndex).fill(name)
		await expect(this.table.groupName.nth(this.lineIndex), 'Group Name should be set').toHaveValue(name)
	}

	@step
	async setPrimaryPassenger(name: string) {
		await this.table.primaryPassenger.nth(this.lineIndex).selectOption(name)
	}

	@step
	async setOtherPassenger(name: string) {
		await this.table.otherPassenger.nth(this.lineIndex).locator('input').click()
		await this.table.otherPassenger.nth(this.lineIndex).locator('ul').getByText(name).click()
		await expect(this.frame.getByRole('combobox', { name: name }), 'Primary Passenger should be set').toBeVisible()
	}
}
