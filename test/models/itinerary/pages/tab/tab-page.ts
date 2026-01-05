import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { Itinerary, RecordType } from '../../types/itinerary'
import { ItineraryRecordEditPage } from '../record/record-edit-page'

export class ItineraryTabPage extends SalesforcePage {
	private readonly header = {
		button: {
			New: this.page.getByRole('button', { name: 'New' }),
			Change_Owner: this.page.getByRole('button', { name: 'Change Owner' }),
			Import: this.page.getByRole('button', { name: 'Import' }),
			Assing_Label: this.page.getByRole('button', { name: 'Assign Label' }),
		},
	}

	private readonly modalNewItinerary = {
		recordtype: (recordTypeName: RecordType) => this.page.getByText(recordTypeName, { exact: true }),
		button: {
			Cancel: this.page.getByRole('button', { name: 'Cancel' }),
			Next: this.page.getByRole('button', { name: 'Next' }),
		},
	}

	@step
	async goto() {
		await this.page.goto(`${this.getOriginUrl()}/lightning/o/PackageNamespace__Itinerary__c/home`)
		await this.waitForOptionalSpinners()
		expect(this.page.url(), 'Itinerary tab is displayed').toContain('PackageNamespace__Itinerary__c')
	}

	@step
	async startCreatingNewRecord(recordTypeName: RecordType = 'Quote') {
		await this.header.button.New.click()
		await expect(
			this.page.getByText('Select a record type'),
			'Itinerary record type selection modal should be displayed'
		).toBeVisible()
		await this.modalNewItinerary.recordtype(recordTypeName).click()
		await this.modalNewItinerary.button.Next.click()
		await expect(this.page.getByText('New Itinerary'), 'New Itinerary form should be displayed').toBeVisible()
		return new ItineraryRecordEditPage(this.page)
	}

	async createNewRecord(given: Itinerary) {
		try {
			await this.startCreatingNewRecord(given.type).then(async (edit) => {
				await edit.fillName(given.name)
				await edit.fillAccount(given.account)
				await edit.fillContact(given.contact)
				await edit.selectChannel(given.channel)
				await edit.fillGroupSize(given.size)
				await edit.saveChanges()
			})
		} catch (error) {
			throw new Error(`creating new itinerary/n${error}`)
		}
	}
}
