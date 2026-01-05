import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { BookingStatus, DefaultTab, RecordType } from '../../types/itinerary'
import { RestApiHandler } from '../../../../../src/api/salesforce/rest-api-handler'
import {
	CompareMapRecords,
	CompareMap,
	SobjectRecordComparator,
} from '../../../../../src/api/salesforce/record-comparator'
import { TaskEditPage } from '../../../task/pages/edit-page'

export class ItineraryRecordDetailsPage extends SalesforcePage {
	private readonly tabset = (name: DefaultTab) => this.page.getByRole('tab', { name: name, exact: true }).first()

	private readonly fields = {
		bookingConfirmation: this.page
			.locator('records-record-layout-item')
			.filter({ hasText: 'Booking Confirmation' })
			.locator('img'),
		recordType: this.page.locator(
			"//*[contains(@class,'recordTypeName') and ancestor::*[(contains(@class,'active'))]]"
		),
		nameOnBooking: this.page.locator("//*[@field-label='Name on booking']").locator("//*[@slot='outputField']"),
		bookingCheckbox: this.page.locator("input[type='checkbox'][name='PackageNamespace__Booking__c']"),
	}

	private readonly buttons = {
		convertToBooking: this.page.getByRole('button', { name: 'Convert To Booking' }),
		showMoreActions: this.page.getByRole('button', { name: 'Show more actions' }),
		createAmendment: this.page.getByRole('menuitem', { name: 'Create Amendment' }),
		mergeAmendment: this.page.getByRole('menuitem', { name: 'Merge Amendment' }),
		mergeAmendmentConfirm: this.page.getByRole('button', { name: 'Merge', exact: true }),
	}

	private readonly messages = {
		amendmentInProgress: {
			textCreation: 'Amendment creation is in progress',
			textMerging: 'Amendment merging is in progress',
			container: this.page.locator('PackageNamespace-lwc-amendment-in-progress-toast').last(),
		},
	}

	private readonly related = {
		tasks: {
			buttonExpand: this.page.getByRole('button', { name: 'Tasks' }),
			buttonNewTask: this.page.getByLabel('New Task'),
		},
	}

	readonly using = (api: RestApiHandler) => {
		const recordHandler = new SobjectRecordComparator(api)
		const map = (map: CompareMap) => {
			const getRecords = async () => recordHandler.getRecords(map, api, await this.getRecordId())
			const compare = async (expected: CompareMapRecords, actual: CompareMapRecords) =>
				recordHandler.compare(map, expected, actual)
			return { compare, getRecords }
		}
		return { map }
	}

	@step
	async openTab(name: DefaultTab) {
		await this.tabset(name).click()
		await expect(this.tabset(name), `${name} tab is selected`).toHaveAttribute('aria-selected', 'true')
		await this.waitForOptionalSpinners()
	}

	@step
	async createAmendment() {
		await this.buttons.showMoreActions.click()
		await this.buttons.createAmendment.click()
		await expect(this.messages.amendmentInProgress.container, 'Itineary Amendment should start').toContainText(
			this.messages.amendmentInProgress.textCreation
		)
		const currentUrl = this.page.url()
		await expect(this.page, 'Page should be redirected to the Amendment record').not.toHaveURL(currentUrl, {
			timeout: 5 * 60000,
		})
		await expect(this.fields.recordType, 'Itinerary should have Amendment record type').toHaveText(
			<RecordType>'Amendment'
		)
	}

	@step
	async mergeAmendment() {
		await this.buttons.showMoreActions.click()
		await this.buttons.mergeAmendment.click()
		await this.buttons.mergeAmendmentConfirm.click()
		await expect(
			this.messages.amendmentInProgress.container,
			'Itineary Amendment Merging should start'
		).toContainText(this.messages.amendmentInProgress.textMerging)
		const currentUrl = this.page.url()
		await expect(this.page, 'Page should be redirected to the Primary Booking record').not.toHaveURL(currentUrl, {
			timeout: 5 * 60000,
		})
		await expect(this.fields.recordType, 'Itinerary should have Booking record type').toHaveText(
			<RecordType>'Booking'
		)
	}

	@step
	async convertToBooking() {
		await this.buttons.convertToBooking.click()
		await this.waitForSpinners()
		await this.openTab('Details')
		await expect(this.fields.recordType, 'Itinerary should have Booking record type').toHaveText(
			<RecordType>'Booking'
		)
	}

	@step
	async getTab(name: DefaultTab) {
		return this.tabset(name)
	}

	@step
	async getBooking() {
		return this.fields.bookingCheckbox
	}

	@step
	async getRecordId() {
		return this.getSalesforceIdFromUrl()
	}

	@step
	async getNameOnBooking(): Promise<string | null> {
		return await this.fields.nameOnBooking.textContent()
	}

	@step
	async getBookingStatus(): Promise<BookingStatus> {
		const iconResource = await this.fields.bookingConfirmation.getAttribute('src')
		if (iconResource?.includes('BookingConfirmed')) {
			return 'Confirmed'
		}
		if (iconResource?.includes('BookingUnconfirmed')) {
			return 'Unconfirmed'
		}
		throw new Error(`booking status contains unknown status with icon resource: ${iconResource}`)
	}

	@step
	async getRecordType(): Promise<RecordType> {
		return (await this.fields.recordType.textContent()) as RecordType
	}

	@step
	async startAddingTask() {
		await this.related.tasks.buttonExpand.click()
		await this.related.tasks.buttonNewTask.click()
		return new TaskEditPage(this.page).ready
	}
}
