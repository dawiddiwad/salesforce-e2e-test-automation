import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class TripRecordDetailsPage extends SalesforcePage {
	private readonly button = {
		packageSearch: this.page.getByRole('button', { name: 'Package Search' }).describe('Package Search button'),
	}

	@step
	async openPackageSearch() {
		await this.button.packageSearch.click()
		await this.salesforcePerformanceBeacon()
		await expect(this.page, 'page should be redirected to the Package Search').toHaveURL(/Package_Search/)
	}
}
