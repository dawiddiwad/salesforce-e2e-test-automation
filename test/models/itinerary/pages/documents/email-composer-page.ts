import { FrameLocator, Page, expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { SpecificProjectNamingPolicy } from '../../../../policies/specific-project'

export class ItineraryEmailComposerPage extends SalesforcePage {
	private readonly composer: FrameLocator = this.page.frameLocator('iframe[title="Email Composer"]')
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.emailComposerTitle, 'itinerary email composer is ready')
			.toBeVisible()
			.then(() => this)
	}

	textbox = {
		to: this.composer.getByRole('row', { name: 'To' }).getByRole('textbox').first(),
	}

	button = {
		send: this.composer.getByRole('button', { name: 'Send' }),
	}

	private readonly emailComposerTitle = this.composer.getByText('Email Composer', { exact: true })

	@step
	async setTo(email: string = SpecificProjectNamingPolicy.email.unique()) {
		await this.textbox.to.fill(email)
		await expect(this.textbox.to, `to textbox should be filled with ${email}`).toHaveValue(email)
		return email
	}

	@step
	async send() {
		await this.button.send.click()
		await this.waitForSpinners()
		await expect(this.emailComposerTitle, 'email composer should be hidden').toBeHidden()
	}
}
