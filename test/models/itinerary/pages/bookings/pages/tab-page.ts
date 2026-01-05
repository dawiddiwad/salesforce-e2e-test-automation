import { expect, Locator } from '@playwright/test'
import { SalesforcePage } from '../../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../runners/custom-test-runner'
import {
	Booking,
	BookingStatus,
	ConfirmationAction,
	ConfirmationMethod,
	ConfirmationStatus,
} from '../../../types/tab-bookings'

export class ItineraryBookingsTabPage extends SalesforcePage {
	private readonly bookings = {
		table: {
			container: () => this.page.locator('table.builder-table').describe('bookings table'),
			header: () => this.bookings.table.container().locator('thead tr').describe('header row'),
			supplierByName: (name: string) =>
				this.bookings.table
					.container()
					.locator(`tr.supplier-row`)
					.filter({ hasText: name })
					.describe(`supplier row: ${name}`),
			bookingByName: (using: Booking) =>
				this.bookings.table
					.container()
					.locator(
						`//tr[contains(@class, 'supplier-row') and contains(., '${using.supplier}')]/following-sibling::tr[contains(., '${using.name}')]`
					)
					.describe(`booking row: ${using.name}`),
			bookingByStatus: (status: ConfirmationStatus) =>
				this.page
					.locator("//tr[not(contains(@class,'supplier-row'))]", {
						has: this.page.locator(
							`//td[contains(@class, 'confirmation-status-col') and contains(., '${status}')]`
						),
					})
					.describe(`booking row with status ${status}`),
			columns: {
				confirmationStatus: (row: Locator) =>
					row.locator('td.confirmation-status-col').describe('confirmation status column'),
				select: (row: Locator) =>
					row.locator('td.select-col').or(row.locator('th.select-col')).describe('action column'),
			},
		},
	}

	private readonly modal = {
		confirmationAction: {
			container: () =>
				this.page
					.locator('.slds-modal', { hasText: 'Confirmation Action' })
					.describe('confirmation action modal'),
			input: (method: ConfirmationMethod) =>
				this.modal.confirmationAction
					.container()
					.locator(`//slot[contains(., '${method}')]`)
					.getByPlaceholder('Please select option')
					.describe('select action dropdown'),
			option: (action: ConfirmationAction) =>
				this.page.locator(`[data-label='${action}']`).describe(`${action} option`),
			saveButton: () => this.modal.confirmationAction.container().getByRole('button', { name: 'Save' }),
		},
		modalLiveServices: {
			headerBookServices: this.page
				.getByRole('heading', { name: 'Book Services' })
				.describe('book services header'),
			headerCancelServices: this.page
				.getByRole('heading', { name: 'Cancel Services' })
				.describe('cancel services header'),
			line: this.page.locator('c-lwc-itinerary-book-services-line').describe('book services line'),
			buttonDone: this.page.getByRole('button', { name: 'Done' }),
			reservationFailed: {
				popover: this.page
					.getByRole('heading', { name: 'Reservation Failed' })
					.describe('reservation failed popover'),
				buttonBookAnother: this.page.getByRole('button', { name: 'Book Another' }),
				buttonSkip: this.page.getByRole('button', { name: 'Skip' }),
				buttonRetry: this.page.getByRole('button', { name: 'Retry' }),
				cartWithOneService: this.page
					.getByText('1 service', { exact: true })
					.describe('cart with 1 serivce selected'),
				buttonUpdateItinerary: this.page.getByRole('button', { name: 'Update Itinerary' }),
			},
			cancellationPolicy: {
				popover: this.page
					.getByRole('heading', { name: 'Cancellation Policy' })
					.describe('cancellation policy popover'),
				buttonAknowledgeAndBook: this.page.getByRole('button', { name: 'Acknowledge & Book' }),
				buttonProceed: this.page.getByRole('button', { name: 'Proceed' }),
			},
			confirmBooking: {
				popover: this.page
					.getByRole('heading', { name: 'Confirm Booking' })
					.describe('confirm booking popover'),
				buttonBook: this.page.getByRole('button', { name: 'Book', exact: true }),
			},
		},
	}

	private readonly button = {
		confirmationAction: this.page.getByRole('button', { name: 'Confirmation Action' }),
	}

	@step
	async getSupplierByName(supplierName: string) {
		await expect(
			this.bookings.table.supplierByName(supplierName),
			`supplier row: ${supplierName} should be visible`
		).toBeVisible()
		return this.bookings.table.supplierByName(supplierName)
	}

	@step
	async setConfirmationOnAllServices(using: { action: ConfirmationAction; method: ConfirmationMethod }) {
		await this.waitForOptionalSpinners()
		await this.bookings.table.columns.select(this.bookings.table.header()).click()
		await this.button.confirmationAction.click()
		await this.modal.confirmationAction.input(using.method).click()
		await this.modal.confirmationAction.option(using.action).click()
		await this.modal.confirmationAction.saveButton().click()
		await this.waitForSpinners()
		await expect(
			this.modal.confirmationAction.container(),
			'confirmation action modal should be hidden'
		).toBeHidden()
	}

	@step
	async confirmApiServices() {
		await this.setConfirmationOnAllServices({ action: 'Confirm', method: 'API' })
		await this.bookLiveServices()
	}

	@step
	async confirmEmailServices() {
		await this.setConfirmationOnAllServices({ action: 'Confirm', method: 'Email' })
	}

	@step
	async confirmManualServices() {
		await this.setConfirmationOnAllServices({ action: 'Confirm', method: 'Manual' })
	}

	@step
	async cancelApiServices() {
		await this.setConfirmationOnAllServices({ action: 'Cancel', method: 'API' })
		await this.cancelLiveServices()
	}

	@step
	async unconfirmEmailServices() {
		await this.setConfirmationOnAllServices({ action: 'Unconfirm', method: 'Email' })
	}

	@step
	async unconfirmManualServices() {
		await this.setConfirmationOnAllServices({ action: 'Unconfirm', method: 'Manual' })
	}

	@step
	async bookLiveServices() {
		await expect(
			this.modal.modalLiveServices.headerBookServices,
			'book services modal should be visible'
		).toBeVisible()
		await this.waitForOptionalSpinners()
		const bookingLines = () => this.modal.modalLiveServices.line.all()
		for (const bookingLine of await bookingLines()) {
			await this.processBookingLine(bookingLine)
		}
		await this.modal.modalLiveServices.buttonDone.click()
		await expect(
			this.modal.modalLiveServices.headerBookServices,
			'book services modal should be hidden'
		).toBeHidden()
	}

	@step
	async cancelLiveServices() {
		await expect(
			this.modal.modalLiveServices.headerCancelServices,
			'cancel services modal should be visible'
		).toBeVisible()
		await this.waitForOptionalSpinners()
		const cancelingLines = () => this.modal.modalLiveServices.line.all()
		for (const cancelingLine of await cancelingLines()) {
			await this.processBookingLine(cancelingLine)
		}
		await this.modal.modalLiveServices.buttonDone.click()
		await expect(
			this.modal.modalLiveServices.headerCancelServices,
			'cancel services modal should be hidden'
		).toBeHidden()
	}

	@step
	async getBookingNumber(bookingLine: Locator) {
		return bookingLine.locator('td.reservation-number-col')
	}

	@step
	async getBookingStatus(bookingLine: Locator) {
		return bookingLine.locator('td.status-col')
	}

	@step
	async getBookingName(bookingLine: Locator) {
		return bookingLine.locator('td.full-name-col')
	}

	@step
	async processBookingLine(bookingLine: Locator) {
		let bookingShouldBeEmpty: boolean = false
		const bookingName = await this.getBookingName(bookingLine).then((cell) => cell.textContent())

		await expect(
			this.modal.modalLiveServices.confirmBooking.popover
				.or(this.modal.modalLiveServices.cancellationPolicy.popover)
				.or(this.modal.modalLiveServices.reservationFailed.popover),
			`popover should be visible for ${bookingName}`
		).toBeVisible()

		const processCancellationPolicy = async () => {
			if (await this.modal.modalLiveServices.cancellationPolicy.buttonProceed.isVisible()) {
				await this.modal.modalLiveServices.cancellationPolicy.buttonProceed.click()
				await expect(
					this.modal.modalLiveServices.cancellationPolicy.popover,
					`cancellation policy popover should be hidden for ${bookingName}`
				).toBeHidden()
				await expect(
					await this.getBookingStatus(bookingLine),
					`booking status for ${bookingName} should be Confirmed Cancellation`
				).toContainText(<BookingStatus>'Confirmed Cancellation')
			} else if (await this.modal.modalLiveServices.cancellationPolicy.buttonAknowledgeAndBook.isVisible()) {
				await this.modal.modalLiveServices.cancellationPolicy.buttonAknowledgeAndBook.click()
			} else {
				throw new Error(`unknown cancellation policy process for ${bookingName}`)
			}
		}
		const processConfirmBooking = async () => {
			await expect(
				await this.getBookingStatus(bookingLine),
				`booking status for ${bookingName} should be Evaluated`
			).toContainText(<BookingStatus>'Evaluated')
			await this.modal.modalLiveServices.confirmBooking.buttonBook.click()
			await expect(
				await this.getBookingStatus(bookingLine),
				`booking status for ${bookingName} should be Booked Held`
			).toContainText(<BookingStatus>'Booked Held')
		}
		const processFailedReservation = async () => {
			await expect(
				this.modal.modalLiveServices.reservationFailed.buttonBookAnother.or(
					this.modal.modalLiveServices.reservationFailed.buttonRetry
				),
				'book another or retry button should be visible'
			).toBeVisible()
			if (await this.modal.modalLiveServices.reservationFailed.buttonRetry.isVisible()) {
				await processSkippedReservation()
				bookingShouldBeEmpty = true
				return
			}
			await this.modal.modalLiveServices.reservationFailed.buttonBookAnother.click()
			await expect(
				this.modal.modalLiveServices.reservationFailed.cartWithOneService,
				'cart with 1 alternative service selected should be visible'
			).toBeVisible()
			await this.modal.modalLiveServices.reservationFailed.buttonUpdateItinerary.click()
			await this.processBookingLine(bookingLine)
			await expect(
				await this.getBookingStatus(bookingLine),
				`booking status for ${bookingName} should be Booked`
			).toContainText(<BookingStatus>'Booked')
		}
		const processSkippedReservation = async () => {
			await this.modal.modalLiveServices.reservationFailed.buttonSkip.click()
			await expect(
				await this.getBookingStatus(bookingLine),
				`booking status for ${bookingName} should be Skipped`
			).toContainText(<BookingStatus>'Skipped')
		}

		if (await this.modal.modalLiveServices.reservationFailed.popover.isVisible()) {
			await processFailedReservation()
		} else if (await this.modal.modalLiveServices.cancellationPolicy.popover.isVisible()) {
			await processCancellationPolicy()
		} else if (await this.modal.modalLiveServices.confirmBooking.popover.isVisible()) {
			await processConfirmBooking()
		}

		if (bookingShouldBeEmpty) {
			await expect(
				await this.getBookingNumber(bookingLine),
				`booking number for ${bookingName} should be empty`
			).toBeEmpty()
		} else {
			await expect(
				await this.getBookingNumber(bookingLine),
				`booking number for ${bookingName} should not be empty`
			).not.toBeEmpty()
		}
	}
}
