import { expect, FrameLocator, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { ItineraryEmailComposerPage } from './email-composer-page'

export class ItineraryCustomerPreviewPage extends SalesforcePage {
	private readonly manager: FrameLocator = this.page.frameLocator('iframe[title="Content Preview"]')
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.customerPreviewTitle, 'itinerary customer preview is ready')
			.toBeVisible()
			.then(() => this)
	}

	private readonly customerPreviewTitle = this.manager.getByText('Customer Preview')
	private readonly buttonSendAndPublish = this.manager.getByRole('button', { name: 'Send and Publish' })
	private readonly spinner = this.manager.locator('#TA-customer-preview-spinner div')

	private readonly sendAndPublishConifrmationDialog = {
		buttonOk: this.manager.getByRole('button', { name: 'OK' }),
	}

	@step
	async sendAndPublish() {
		await this.buttonSendAndPublish.click()
		await this.sendAndPublishConifrmationDialog.buttonOk.click()
		await expect(this.spinner, 'saving spinner should be visible').toBeVisible()
		await expect(this.spinner, 'saving spinner should be hidden').toBeHidden()
		return new ItineraryEmailComposerPage(this.page).ready
	}
}
