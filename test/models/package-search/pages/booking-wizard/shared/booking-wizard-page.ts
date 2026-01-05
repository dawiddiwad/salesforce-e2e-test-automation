import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../../src/models/pages/salesforce-page'
import { BookingWizardTab } from '../../../types/booking-wizard'
import { step } from '../../../../../runners/custom-test-runner'

export abstract class BookingWizardTabPage extends SalesforcePage {
	abstract readonly name: BookingWizardTab

	private readonly wizardSummary = {
		container: this.page.locator('c-lwc-booking-wizard-summary'),
	}

	private readonly wizardPrimaryTraveller = {
		container: this.page.locator('c-lwc-booking-wizard-contact'),
	}

	private readonly wizardButton = {
		backToSearch: this.page.getByRole('button', { name: 'Back to Search', exact: true }),
		createItinerary: this.page.locator('.create-itin'),
		addChangesToItinerary: this.page.getByRole('button', { name: 'Add Changes to Itinerary', exact: true }),
	}

	private readonly wizardTabs = {
		container: this.page.locator('c-lwc-booking-wizard-tabs'),
		item: (name: BookingWizardTab) =>
			this.page.locator('c-lwc-booking-wizard-tabs').locator(`//li[descendant::*[text()='${name}']]`),
	}

	private readonly wizardOptionalAddonsModal = {
		messagePendingAddons:
			'You have not reviewed all the days with optional add-ons. You can review them now or continue to the next step in the booking wizard',
		buttonContinue: this.page.getByRole('button', { name: 'Continue', exact: true }),
	}

	private readonly wizzardPassengerCancelModal = {
		buttonConfirm: this.page.getByRole('button', { name: 'Confirm', exact: true }),
	}

	@step
	async open() {
		await this.wizardTabs.item(this.name).click()
		const tabState = (await this.wizardTabs.item(this.name).getAttribute('class')) ?? 'unknown'
		expect(tabState, `${this.name} tab should be selected`).toEqual('selected')
		return this
	}

	@step
	async createItinerary() {
		try {
			await this.wizardButton.createItinerary.click()
			await expect(this.page, 'page should be redirected to the new Itinerary record').toHaveURL(
				/PackageNamespace__Itinerary__c/,
				{ timeout: 2 * 60000 }
			)
		} catch (error) {
			throw new Error(`creating new Itinerary\n${await this.getToastAlerts()}\n${error}`)
		}
	}

	@step
	async addChangesToItineraryAndSkipOptionalAddons() {
		try {
			await this.wizardButton.addChangesToItinerary.click()
			await expect(
				this.page.getByText(this.wizardOptionalAddonsModal.messagePendingAddons),
				'optional add-ons modal shoukd be visible'
			).toBeVisible()
			await this.wizardOptionalAddonsModal.buttonContinue.click()
			await expect(this.wizardSummary.container, 'booking wizard should be closed').not.toBeVisible()
		} catch (error) {
			throw new Error(`adding changes to Itinerary\n${await this.getToastAlerts()}\n${error}`)
		}
	}

	@step
	async confirmPassengerCancellations() {
		await this.wizzardPassengerCancelModal.buttonConfirm.click()
		await expect(this.page.getByText(/^Confirm Cancel$/), 'confirm cancel modal should be closed').not.toBeVisible()
	}
}
