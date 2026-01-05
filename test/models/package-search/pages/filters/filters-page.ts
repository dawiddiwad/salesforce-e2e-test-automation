import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class PackageSearchFiltersPage extends SalesforcePage {
	private readonly input = {
		clickSpot: this.page.locator("//*[@class='slds-text-heading_large' and .='Package Search']"),
		packageName: {
			search: this.page.getByRole('combobox', { name: 'Package Name' }),
			resultItem: (title: string) => this.page.getByTitle(title, { exact: true }),
			pill: (title: string) => this.page.locator('lightning-pill').getByText(title, { exact: true }),
		},
		dates: {
			start: this.page.locator('c-lwc-package-search-filter-dates .slds-m-right_x-small input.date-selector'),
			end: this.page.locator('c-lwc-package-search-filter-dates .slds-m-left_x-small input.date-selector'),
			buttonToday: this.page.locator('.air-datepicker.-active-').locator('.datepicker-today-button'),
			buttonNext: this.page.locator('.air-datepicker.-active-').locator("[data-action='next']"),
			firstAvailableDate: this.page
				.locator('.air-datepicker.-active-')
				.locator('.air-datepicker-cell.-day-:not(.-weekend-, .-other-month-)')
				.first(),
			pickerContainer: this.page.locator('.air-datepicker.-active-'),
		},
		rooms: {
			buttonAdd: this.page.getByRole('button', { name: 'Add Room Add', exact: true }),
			enabled: () => this.page.locator(".TA-room-container:not([disabled='true'])").all(),
			disabled: () => this.page.locator(".TA-room-container[disabled='true']").all(),
			occupancyChange: () => this.page.locator('.TA-room-container-change-occupancy').all(),
			cancelled: () => this.page.locator('.TA-room-container-cancel-occupancy').all(),
			comboboxAdults: this.page.locator("[data-name='numberOfAdults']"),
			comboboxChildren: this.page.locator("[data-name='numberOfChildren']"),
			selectOccupancy: (occupants: number) =>
				this.page.getByRole('option', { name: occupants.toString() }).click(),
		},
		button: {
			search: this.page.getByText('Search', { exact: true }),
			checkAvailability: this.page.getByRole('button', { name: 'Check Availability', exact: true }),
		},
	}
	results = {
		searchIndicator: this.page.getByText('Searching'),
		button: {
			Results: this.page.getByRole('button', { name: 'Results' }),
			Availability: this.page.getByRole('button', { name: 'Availability' }),
		},
	}

	@step
	async setDatesNextMonth(numberOfMonths: number = 1) {
		await this.input.dates.start.click()
		while (numberOfMonths-- > 0) {
			await this.input.dates.buttonNext.click()
		}
		await expect(async () => await this.setStartDateFirstAvailableDay(), 'dates should be set').toPass()
	}

	@step
	async setStartDateToday() {
		await this.input.dates.start.click()
		await this.input.dates.buttonToday.click()
		await expect(this.input.dates.start, 'start date should be filled').not.toBeEmpty()
		await expect(this.input.dates.end, 'end date should be filled').not.toBeEmpty()
	}

	@step
	async setStartDateFirstAvailableDay() {
		await this.input.dates.start.click()
		await this.input.dates.firstAvailableDate.click()
		await expect(this.input.dates.start, 'start date should be filled').not.toBeEmpty()
		await expect(this.input.dates.end, 'end date should be filled').not.toBeEmpty()
	}

	@step
	async setPackageName(name: string) {
		await this.input.packageName.search.pressSequentially(name, { delay: 50 })
		await expect(
			this.input.packageName.resultItem(name),
			`package ${name} should be visible on the search list`
		).toBeVisible()
		await this.input.packageName.resultItem(name).click()
		await this.input.clickSpot.click()
		await expect(
			this.input.packageName.pill(name),
			`pill for selected package ${name} should be visible`
		).toBeVisible()
	}

	@step
	async setDefaultRooms(amount: number) {
		const currentRooms = async () => (await this.input.rooms.enabled()).length
		let initialRooms = amount - (await currentRooms())
		while (initialRooms-- > 0) {
			await this.input.rooms.buttonAdd.click()
		}
		expect(await currentRooms(), `there should be ${amount} default rooms set`).toEqual(amount)
	}

	@step
	async setOccupancy(change: { room: number; adults: number; children: number }) {
		try {
			const room = await this.input.rooms
				.occupancyChange()
				.then((occupancyChangeRooms) => occupancyChangeRooms[change.room - 1])
			expect(room, `nth:${change.room} room should be defined`).toBeDefined()
			await expect(
				room,
				`nth:${change.room} room should be selected for occupancy change and visible`
			).toBeVisible()

			await room.locator(this.input.rooms.comboboxAdults).click()
			await this.input.rooms.selectOccupancy(change.adults)
			await expect(
				room.locator(this.input.rooms.comboboxAdults),
				`room should have ${change.adults} adults selected`
			).toContainText(change.adults.toString())

			await room.locator(this.input.rooms.comboboxChildren).click()
			await this.input.rooms.selectOccupancy(change.children)
			await expect(
				room.locator(this.input.rooms.comboboxChildren),
				`room should have ${change.children} children selected`
			).toContainText(change.adults.toString())
		} catch (error) {
			throw new Error(`setting occupants on nth:${change.room} room selected for occupancy change\n${error}`)
		}
	}

	@step
	async setEnabledRoomOccupancy(set: { room: number; adults: number; children: number }) {
		try {
			const room = await this.input.rooms.enabled().then((enabledRooms) => enabledRooms[set.room - 1])
			expect(room, `nth:${set.room} room should be defined`).toBeDefined()
			await expect(room, `nth:${set.room} room should be visible and enabled`).toBeVisible()

			await room.locator(this.input.rooms.comboboxAdults).click()
			await this.input.rooms.selectOccupancy(set.adults)
			await expect(
				room.locator(this.input.rooms.comboboxAdults),
				`room should have ${set.adults} adults selected`
			).toContainText(set.adults.toString())

			await room.locator(this.input.rooms.comboboxChildren).click()
			await this.input.rooms.selectOccupancy(set.children)
			await expect(
				room.locator(this.input.rooms.comboboxChildren),
				`room should have ${set.children} children selected`
			).toContainText(set.adults.toString())
		} catch (error) {
			throw new Error(`setting nth:${set.room} room occupants\n${error}`)
		}
	}

	@step
	async searchPackagesAvailability() {
		try {
			await this.input.button.search.click()
			await expect(
				async () => await this.waitForSpinners(),
				'package search should be completed - availability variant'
			).toPass({ timeout: 60000 })
		} catch (error) {
			throw new Error(`searching packages due to\n${await this.getToastAlerts()}\n${error}`)
		}
	}

	@step
	async searchPackagesResults() {
		try {
			await this.input.button.search.click()
			await expect(this.results.searchIndicator, 'package search should start - results variant').toBeVisible({
				timeout: 60000,
			})
			await expect(
				this.results.searchIndicator,
				'package search should be completed - results variant'
			).toBeHidden({ timeout: 60000 })
		} catch (error) {
			throw new Error(`searching packages due to\n${await this.getToastAlerts()}\n${error}`)
		}
	}

	@step
	async checkAvailability() {
		try {
			await this.input.button.checkAvailability.click()
			await expect(async () => await this.waitForSpinners(), 'checking availability should be completed').toPass({
				timeout: 60000,
			})
		} catch (error) {
			throw new Error(`searching packages due to\n${await this.getToastAlerts()}\n${error}`)
		}
	}
}
