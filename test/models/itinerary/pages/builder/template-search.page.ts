import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class ItineraryBuilderTemplateSearchPage extends SalesforcePage {
	private readonly modal = this.page.locator('c-lwc-itinerary-template-search-modal')

	private readonly button = {
		insert: this.page.getByRole('button', { name: 'Insert' }),
	}

	private readonly refineBy = {
		clearButton: this.page.getByText('Clear', { exact: true }),
		searchButton: this.page.getByText('Search', { exact: true }),
		itineraryNameInput: this.page.getByRole('textbox', { name: 'Itinerary Name' }),
	}

	private readonly resultsTable = {
		selectResultRadioButton: this.page.locator('.slds-radio_faux'),
		row: this.modal.locator('tr'),
	}

	@step
	async insertTemplate(name: string) {
		await this.refineBy.clearButton.click()
		await this.refineBy.itineraryNameInput.fill(name)
		await this.refineBy.searchButton.click()
		await expect(
			this.page.getByText(name, { exact: true }),
			`There should be just one Template Search result with Name ${name}`
		).toHaveCount(1)
		await this.resultsTable.row.filter({ hasText: name }).locator(this.resultsTable.selectResultRadioButton).click()
		await this.button.insert.click()
	}
}
