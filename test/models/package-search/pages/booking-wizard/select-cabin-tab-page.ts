import { expect } from '@playwright/test'
import { step } from '../../../../runners/custom-test-runner'
import { BookingWizardTabPage } from './shared/booking-wizard-page'
import { BookingWizardTab } from '../../types/booking-wizard'

export class SelectCabinTabPage extends BookingWizardTabPage {
	name: BookingWizardTab = 'Select Cabin'

	private readonly checkboxAutoSelect = this.page
		.locator("//lightning-primitive-input-checkbox[descendant::*[contains(text(),'Auto Select')]]")
		.locator('.slds-checkbox_faux')

	@step
	async autoSelectCabins() {
		await this.checkboxAutoSelect.check()
		await expect(this.checkboxAutoSelect).toBeChecked()
	}
}
