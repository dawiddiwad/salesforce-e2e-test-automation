import { expect, FrameLocator, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { ItineraryContentManager } from './content-manager'
import { step } from '../../../../runners/custom-test-runner'
import { ItineraryCustomerPreviewPage } from './customer-preview-page'

type Stage = 'Content Settings' | 'Package Content Settings' | 'Train Details' | 'Your Destination(s)'

export class ItineraryContentWizard extends SalesforcePage {
	private readonly manager: FrameLocator = ItineraryContentManager.frame(this.page)
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.linkItineraryContentWizard, 'itinerary content wizard is ready')
			.toBeVisible()
			.then(() => this)
	}

	private readonly linkItineraryContentWizard = this.manager.getByRole('link', { name: 'Itinerary Content Wizard' })

	private readonly path = {
		stage: {
			currentByName: (name: string) =>
				this.manager.locator('li.slds-is-current').getByRole('tab', { name: name, exact: true }),
			byName: (name: string) => this.manager.getByRole('tab', { name: name, exact: true }),
		},
		buttonContinue: this.manager.getByRole('button', { name: 'Continue' }).first(),
		buttonSaveAndPreview: this.manager.getByRole('button', { name: 'Save & Preview' }).first(),
	}

	@step
	async advanceToStage(stage: Stage) {
		expect(this.path.stage.byName(stage), `stage ${stage} should be visible on path`).toBeVisible()
		if (await this.path.stage.currentByName(stage).isVisible()) return
		await this.path.buttonContinue.click()
		return this.advanceToStage(stage)
	}

	@step
	async saveAndPreview() {
		await this.path.buttonSaveAndPreview.click()
		await this.waitForSpinners()
		return new ItineraryCustomerPreviewPage(this.page).ready
	}
}
