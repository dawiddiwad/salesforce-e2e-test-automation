import { expect } from '@playwright/test'
import { SalesforceId } from '../../../../../src/models/types'
import { step } from '../../../../runners/custom-test-runner'
import { BookingWizardTabPage } from './shared/booking-wizard-page'

export abstract class StayTabPage extends BookingWizardTabPage {
	private readonly table = this.page.locator('c-lwc-booking-wizard-pre-post-stay tbody')
	private readonly row = {
		option: (priceCategory: SalesforceId, room: number) =>
			this.table.locator(
				`//tr[not(contains(@class,'existing-room')) and @data-price-category-id='${priceCategory}' and @data-room-index=${room - 1}]`
			),
		header: (hotel: string, room: number) =>
			this.table.locator(
				`//tr[descendant::td[.='${hotel}'] and @data-room-index=${room - 1} and contains(@class,'slds-border_top') and not(contains(@class,'existing-room'))]`
			),
	}
	private readonly column = {
		nights: (nights: number, priceCategory: SalesforceId, room: number) =>
			this.row
				.option(priceCategory, room)
				.locator(`//*[@data-night-number=${nights} and @data-is-selectable='true']`),
	}

	private async getPriceCategoryForHotel(hotel: string, room: number): Promise<SalesforceId> {
		const rowHotel = this.row.header(hotel, room).first()
		await expect(rowHotel, `hotel ${hotel} should be available for room ${room}`).toBeVisible()
		const priceCategory = await rowHotel.getAttribute('data-price-category-id')
		if (!priceCategory) throw new Error(`missing data-price-category-id on hotel ${hotel} room ${room}`)
		else return priceCategory
	}

	@step
	private async setNightsForHotelRoom(nights: number, hotel: string, room: number) {
		const priceCategory = await this.getPriceCategoryForHotel(hotel, room)
		const option = this.column.nights(nights, priceCategory, room)
		await expect(
			option,
			`${nights} nights option on ${hotel} hotel room ${room} should be selectable`
		).toBeVisible()
		await option.click()
		await expect(
			option.locator('.checkbox-icon'),
			`${nights} nights option on ${hotel} hotel room ${room} should be set`
		).toBeVisible()
	}

	forRoom = (room: number) => ({
		andHotel: (hotel: string) => ({
			setNights: async (nights: number) => this.setNightsForHotelRoom(nights, hotel, room),
		}),
	})
}
