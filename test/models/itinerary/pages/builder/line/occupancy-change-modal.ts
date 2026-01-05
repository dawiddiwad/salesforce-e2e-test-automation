import { Page, expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../runners/custom-test-runner'

export class OccupancyChangeModal extends SalesforcePage {
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.modal(), `Occupany Change modal should be visible`)
			.toBeVisible()
			.then(() => this)
	}

	private readonly modal = () => this.page.locator('c-lwc-occupancy-change-modal .slds-modal__container')
	private readonly buttonChangeOccupancy = this.modal().getByRole('button', { name: 'Change Occupancy', exact: true })
	private readonly buttonCancel = this.modal().getByRole('button', { name: 'Cancel', exact: true })
	private readonly room = {
		container: (roomNumber: number) =>
			this.modal()
				.locator('.room')
				.filter({ has: this.page.getByRole('heading', { name: `Room ${roomNumber}`, exact: true }) }),
		buttonCancelRoom: (roomNumber: number) =>
			this.room.container(roomNumber).getByText('Cancel Room', { exact: true }),
		buttonChangeOccupancy: (roomNumber: number) =>
			this.room.container(roomNumber).getByText('Change Occupancy', { exact: true }),
	}

	private async checkVisibilityForRoom(number: number) {
		await expect(this.room.container(number), `room ${number} should be visible`).toBeVisible()
	}

	@step
	private async setCancellationForRoom(number: number) {
		await this.checkVisibilityForRoom(number)
		await this.room.buttonCancelRoom(number).click()
		await expect(this.room.container(number), `room ${number} should be selected for cancellation`).toHaveClass(
			/(^|\s)selected-remove(\s|$)/
		)
	}

	@step
	private async setChangeOccupancyForRoom(number: number) {
		await this.checkVisibilityForRoom(number)
		await this.room.buttonChangeOccupancy(number).click()
		await expect(this.room.container(number), `room ${number} should be selected for occupancy change`).toHaveClass(
			/(^|\s)selected-change(\s|$)/
		)
	}

	forRoom = (number: number) => ({
		setCancellation: () => this.setCancellationForRoom(number),
		setOccupancyChange: () => this.setChangeOccupancyForRoom(number),
	})

	@step
	async changeOccupancy() {
		await this.buttonChangeOccupancy.click()
		await expect(
			this.page.getByText('Package Search', { exact: true }),
			'package search should be displayed'
		).toBeVisible()
	}
}
