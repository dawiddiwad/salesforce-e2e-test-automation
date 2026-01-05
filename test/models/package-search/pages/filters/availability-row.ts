import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class PackageSearchAvailabilityRow extends SalesforcePage {
	private readonly rowIndex: number
	readonly ready: Promise<this>

	constructor(page: Page, rowIndex: number) {
		super(page)
		this.rowIndex = rowIndex
		this.ready = expect(
			this.table.row.container(),
			`package search availabilty results row ${++rowIndex} should be visible`
		)
			.toBeVisible({ timeout: 5000 })
			.then(() => this)
	}

	private readonly table = {
		row: {
			container: () => this.page.locator('c-lwc-package-search-availability-row').nth(this.rowIndex),
			slotsAvailable: () =>
				this.page
					.locator('c-lwc-package-search-availability-row')
					.nth(this.rowIndex)
					.locator('.availability-day.white')
					.all(),
			slotsNotAvailable: () =>
				this.page
					.locator('c-lwc-package-search-availability-row')
					.nth(this.rowIndex)
					.locator('.availability-day.dash')
					.all(),
		},
	}

	private readonly summary = {
		container: () => this.page.locator('.package-summary-container').nth(this.rowIndex),
		placeholders: () => this.page.locator('.row-placeholder').all(),
		buttonAddOptions: () => this.page.getByText('Add Options').nth(this.rowIndex),
	}

	@step
	async selectFirstAvailableDay() {
		await this.table.row.slotsAvailable().then((slots) => slots[0].click())
		await expect(this.summary.container(), 'package extended view should be opened').toBeVisible()
		await expect(async () => this.waitForSpinners(), 'package extend view should finish loading').toPass()
	}

	@step
	async proceedToBookingWizard() {
		await this.summary.buttonAddOptions().click()
		await expect(this.page.locator('c-lwc-booking-wizard'), 'booking wizard view should be opened').toBeVisible()
		await expect(async () => this.waitForSpinners(), 'booking wizard should finish loading').toPass()
	}
}
