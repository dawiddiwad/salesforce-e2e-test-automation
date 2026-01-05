import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class TripTabPage extends SalesforcePage {
	private readonly header = {
		new: this.page.getByRole('button', { name: 'New' }).describe('New button on the Trip tab header'),
	}

	@step
	async createNewRecord() {
		await this.header.new.click()
		await expect(this.page.getByText('Create a New Trip'), 'New Trip form should be displayed').toBeVisible()
	}
}
