import { expect } from '@playwright/test'
import { step } from '../../../../runners/custom-test-runner'
import { BookingWizardTabPage } from './shared/booking-wizard-page'
import { BookingWizardTab } from '../../types/booking-wizard'

export class OptionsTabPage extends BookingWizardTabPage {
	name: BookingWizardTab = 'Options'

	private readonly optionRow = (option: string, room: number) =>
		this.page.locator(`//tr[descendant::*[.='${option}'] and descendant::*[@data-room-index=${room}]]`)

	private readonly button = {
		day: (day: number) =>
			this.page
				.locator('c-lwc-booking-wizard-options-day-ribbon ul.days')
				.locator(`//li[@data-day-index=${--day}]`),
		option: (option: string, room: number) => this.optionRow(option, room).locator("//*[@class='col-option']"),
	}

	@step
	private async setOptionForRoom(option: string, room: number) {
		const optionRadioButton = this.button.option(option, room)
		await expect(optionRadioButton, `option ${option} for room ${room} should be available`).toBeVisible()
		await optionRadioButton.click()
		await expect(
			optionRadioButton.locator('.option-item-icon-checked'),
			`option ${option} for room ${room} is set`
		).toBeVisible()
	}

	@step
	async selectDay(day: number) {
		await expect(this.button.day(day), `day ${day} should be available`).toBeVisible()
		await this.button.day(day).click()
		const daySelected = async () => expect(await this.button.day(day).getAttribute('class')).toContain('selected')
		await expect(async () => daySelected(), `day ${day} should be selected`).toPass()
		return this
	}

	forRoom = (room: number) => ({
		setOption: async (option: string) => this.setOptionForRoom(option, room),
	})
}
