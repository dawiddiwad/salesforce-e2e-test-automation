import { expect, Page, FrameLocator } from '@playwright/test'
import { step } from '../../../../runners/custom-test-runner'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { ItineraryContentManager } from './content-manager'
import { ItineraryContentWizard } from './itinerary-content-wizard-page'
import { ItineraryCustomerPreviewPage } from './customer-preview-page'

export class ItineraryContentPage extends SalesforcePage {
	readonly ready: Promise<this>
	readonly manager: FrameLocator = ItineraryContentManager.frame(this.page)

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.itineraryContentEditForm.header, 'new itinerary content form should be displayed')
			.toBeVisible()
			.then(() => this)
	}

	private readonly itineraryContentEditForm = {
		header: this.manager.getByText('Create Itinerary Content'),
		template: {
			container: this.manager.locator('remote-autocomplete').describe('template seletion field'),
			input: this.manager.getByRole('textbox', { name: 'Template' }).describe('template search input'),
			option: (name: string) =>
				this.manager.getByRole('option', { name, exact: true }).describe(`template option ${name}`),
		},
		saveButton: this.manager.getByRole('button', { name: 'Save' }),
	}

	@step
	async selectTemplate(name: string) {
		await this.itineraryContentEditForm.template.input.fill(name)
		await this.itineraryContentEditForm.template.option(name).click()
		await expect(
			this.itineraryContentEditForm.template.container.getByText(name),
			'template should be selected'
		).toBeVisible()
	}

	@step
	async saveChangesAndOpenWizard() {
		await this.itineraryContentEditForm.saveButton.click()
		return new ItineraryContentWizard(this.page).ready
	}

	@step
	async saveChangesAndOpenPreview() {
		await this.itineraryContentEditForm.saveButton.click()
		return new ItineraryCustomerPreviewPage(this.page).ready
	}
}
