import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../src/models/pages/salesforce-page'
import { step } from '../../../runners/custom-test-runner'

export class ContactRecordDetailsPage extends SalesforcePage {
	private readonly actions = {
		showMore: this.page.getByRole('button', { name: 'Show more actions' }),
		packageSearch: this.page.locator(
			"//*[@data-target-selection-name='sfdc:QuickAction.Contact.PackageNamespace__QA_Package_Search']"
		),
	}

	@step
	async openPackageSearch() {
		await this.actions.showMore.click()
		await this.actions.packageSearch.click()
		await this.salesforcePerformanceBeacon()
		await expect(this.page, 'page should be redirected to the Package Search').toHaveURL(
			/PackageNamespace__QA_Package_Search/
		)
	}
}
