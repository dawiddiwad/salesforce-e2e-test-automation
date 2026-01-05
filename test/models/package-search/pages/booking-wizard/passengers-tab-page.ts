import { expect } from '@playwright/test'
import { step } from '../../../../runners/custom-test-runner'
import { BookingWizardTabPage } from './shared/booking-wizard-page'
import { BookingWizardTab } from '../../types/booking-wizard'

export class PassengersTabPage extends BookingWizardTabPage {
	name: BookingWizardTab = 'Passengers'

	private readonly button = {
		setRoomForPassenger: (room: number, passenger: number) =>
			this.page.locator(
				`((//c-lwc-booking-wizard-passengers-rooms-selector)[${passenger}]//*[@class='TA-select-room-button'])[${room}]`
			),
	}

	@step
	private async setRoomForPassenger(room: number, passenger: number) {
		const roomSet = async () =>
			(await this.button.setRoomForPassenger(room, passenger).getAttribute('variant')) === 'brand' ? true : false
		if (await roomSet()) return
		else await this.button.setRoomForPassenger(room, passenger).click()
		expect(await roomSet(), `room ${room} should be set for passenger ${passenger}`).toBeTruthy()
	}

	forPassenger = (passenger: number) => ({
		setRoom: async (room: number) => this.setRoomForPassenger(room, passenger),
	})
}
