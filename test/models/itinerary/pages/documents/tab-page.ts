import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { ItineraryContentPage } from './itinerary-content-page'

export class ItineraryDocumentsTabPage extends SalesforcePage {
	protected readonly contentManager = {
		frame: this.page.frameLocator('iframe[title="Content Manager"]'),
	}

	private readonly tab = {
		itineraryContent: this.contentManager.frame.getByRole('tab', { name: 'Itinerary Content', exact: true }),
		contentSettings: this.contentManager.frame.getByRole('tab', { name: 'Content Settings', exact: true }),
		packageContentSettings: this.contentManager.frame.getByRole('tab', {
			name: 'Package Content Settings',
			exact: true,
		}),
	}

	private readonly itineraryContentTab = {
		buttonNew: () => this.contentManager.frame.getByRole('button', { name: 'New' }),
	}

	@step
	async openItineraryContentTab() {
		await this.tab.itineraryContent.click()
		await expect(this.tab.itineraryContent, 'itinerary content tab should be selected').toHaveAttribute(
			'aria-selected',
			'true'
		)
	}

	@step
	async openContentSettingsTab() {
		await this.tab.contentSettings.click()
		await expect(this.tab.contentSettings, 'content settings tab should be selected').toHaveAttribute(
			'aria-selected',
			'true'
		)
	}

	@step
	async openPackageContentSettingsTab() {
		await this.tab.packageContentSettings.click()
		await expect(
			this.tab.packageContentSettings,
			'package content settings tab should be selected'
		).toHaveAttribute('aria-selected', 'true')
	}

	@step
	async startCreatingNewContent() {
		await this.itineraryContentTab.buttonNew().click()
		return new ItineraryContentPage(this.page).ready
	}
}
