import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { ItineraryGroupLinePage } from './group-line-page'
import { ItineraryGroup } from '../../types/tab-passengers'

export class ItineraryManageGroupsPage extends SalesforcePage {
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.heading, 'Manage Itinerary Groups modal should be visible')
			.toBeVisible()
			.then(() => this)
	}

	private readonly frame = this.page
		.getByLabel('Passengers')
		.locator('iframe[title="accessibility title"]')
		.contentFrame()
	private readonly addGroupButton = this.frame.getByRole('button', { name: 'Add Group' })
	private readonly saveButton = this.frame.getByRole('button', { name: 'Save' })
	private readonly heading = this.frame.getByRole('heading', { name: 'Manage Itinerary Groups' })
	private readonly savedSuccessfullyMessage = this.page.getByText('Itinerary Group was updated.', { exact: true })

	@step
	async addGroup(data: ItineraryGroup) {
		await this.addGroupButton.click()
		await new ItineraryGroupLinePage(this.page, -1).ready.then(async (line) => {
			await line.setGroupName(data.name)
			await line.setPrimaryPassenger(data.primaryPassenger)
			if (data.otherPassenger) await line.setOtherPassenger(data.otherPassenger)
		})
	}

	@step
	async saveGroups() {
		await this.saveButton.click()
		await expect(this.savedSuccessfullyMessage, 'Passenger Groups should be saved').toBeVisible()
	}
}
