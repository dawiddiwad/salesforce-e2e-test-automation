import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { ItineraryPassengersLinePage } from './passengers-line-page'
import { ItineraryManageGroupsPage } from './manage-groups-page'
import { ItineraryPassengerAllocationPage } from './passenger-allocation-page'

export class ItineraryPassengersTabPage extends SalesforcePage {
	private readonly frame = this.page
		.getByLabel('Passengers')
		.locator('iframe[title="accessibility title"]')
		.contentFrame()
	private readonly saveButton = this.frame.getByRole('button', { name: 'Save' })
	private readonly unsavedChangesWarning = this.frame.getByText('You have unsaved changes.', { exact: true })
	private readonly savedSuccessfullyMessage = this.frame.getByText('Successfully saved')
	private readonly manageItineraryGroupsButton = this.frame.getByRole('button', { name: 'Manage Itinerary Groups' })
	private readonly passengerAllocationTab = this.page.getByRole('tab', { name: 'Passenger Allocation', exact: true })

	@step
	async getLine(number: number): Promise<ItineraryPassengersLinePage> {
		return new ItineraryPassengersLinePage(this.page, --number).ready
	}

	@step
	async saveChanges() {
		await expect(this.saveButton, 'save button should be visible').toBeVisible()
		await this.saveButton.dispatchEvent('click')
		await expect(this.unsavedChangesWarning, 'changes should be saved').toBeHidden()
	}

	@step
	async openManageItineraryGroups() {
		await this.manageItineraryGroupsButton.click()
		return new ItineraryManageGroupsPage(this.page).ready
	}

	@step
	async openPassengerAllocationTab() {
		await this.passengerAllocationTab.click()
		return new ItineraryPassengerAllocationPage(this.page).ready
	}
}
