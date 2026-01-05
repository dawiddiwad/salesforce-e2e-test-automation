import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class PackageSearchResultsRow extends SalesforcePage {
	private readonly rowIndex: number
	readonly ready: Promise<this>

	constructor(page: Page, rowIndex: number) {
		super(page)
		this.rowIndex = rowIndex
		this.ready = expect(this.table.row.container(), `package search results row ${++rowIndex} should be visible`)
			.toBeVisible({ timeout: 5_000 })
			.then(() => this)
	}

	private readonly table = {
		row: {
			container: () => this.page.locator('.package-search-results__table .row-item').nth(this.rowIndex),
			addToItinerary: () => this.table.row.container().locator('.row-item__add-to-itinerary'),
		},
	}

	private readonly modal = {
		addingPackage: this.page.getByRole('heading', { name: 'Adding package to Itinerary' }),
	}

	@step
	async addPackageToItinerary() {
		await this.table.row.addToItinerary().click()
		try {
			await expect(this.modal.addingPackage, 'adding package to itinerary should start').toBeVisible()
			await expect(this.modal.addingPackage, 'adding package to itinerary should finish').toBeHidden({
				timeout: 2 * 60_000,
			})
			await expect(this.page, 'page should be redirected to the new itinerary record').toHaveURL(/Itinerary__c/, {
				timeout: 2 * 60_000,
			})
		} catch (error) {
			throw new Error(`adding package to itinerary\n${await this.getToastAlerts()}\n${error}`)
		}
	}
}
