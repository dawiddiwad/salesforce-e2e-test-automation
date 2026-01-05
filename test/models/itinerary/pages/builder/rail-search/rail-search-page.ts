import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../runners/custom-test-runner'
import { JourneyPage } from './journey/journey-page'

export class RailSearchPage extends SalesforcePage {
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.searchBar.header, `Rail Search should be visible`)
			.toBeVisible()
			.then(() => this.waitForOptionalSpinners())
			.then(() => this)
			.catch((error) => {
				throw new Error(`Rail Search should be ready\n${error}`)
			})
	}

	private readonly header = {
		updateItinerary: this.page.getByRole('button', { name: 'Update Itinerary' }),
	}

	private readonly searchBar = {
		header: this.page.getByText('Rail Search', { exact: true }),
	}

	private readonly results = {
		moreDates: {
			toggle: () => this.page.getByRole('button', { name: 'More Dates' }).click(),
			calendar: this.page.locator('.rail-search-calendar-slider'),
			selectedDay: () => this.page.locator('.calendar-day[selected="true"]'),
			selectedDayIndex: async () => {
				const index = await this.results.moreDates.selectedDay().getAttribute('data-index')
				if (index) return Number(index)
				else throw new Error('unable to get index of selected day')
			},
			nextDay: async () =>
				this.page.locator(
					`.calendar-day[data-index="${(await this.results.moreDates.selectedDayIndex()) + 1}"]`
				),
			previousDay: async () =>
				this.page.locator(
					`.calendar-day[data-index="${(await this.results.moreDates.selectedDayIndex()) - 1}"]`
				),
		},
	}

	@step
	async setCalendarSliderDay(day: 'next' | 'previous') {
		if (await this.results.moreDates.calendar.isHidden()) {
			await this.results.moreDates.toggle()
		}
		const beforeDate = await this.results.moreDates.selectedDay().locator('.date-formatted').textContent()
		if (day === 'next') {
			await this.results.moreDates.nextDay().then((day) => day.click())
		} else {
			await this.results.moreDates.previousDay().then((day) => day.click())
		}
		const afterDate = await this.results.moreDates.selectedDay().locator('.date-formatted').textContent()
		expect(afterDate, `selected day should change`).not.toEqual(beforeDate)
	}

	@step
	async getJourney(positionFromTop: number) {
		return new JourneyPage(this.page, --positionFromTop).ready
	}

	@step
	async updateItinerary() {
		await this.header.updateItinerary.click()
		await expect(this.searchBar.header, `Rail Search should be closed after updating itinerary`).not.toBeVisible()
	}
}
