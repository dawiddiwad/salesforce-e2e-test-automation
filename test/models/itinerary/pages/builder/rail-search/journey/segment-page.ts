import { expect, Locator, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../../runners/custom-test-runner'

export class SegmentPage extends SalesforcePage {
	private readonly indexFromTop: number
	private segment: Locator
	readonly ready: Promise<this>

	constructor(page: Page, indexFromTop: number) {
		super(page)
		this.indexFromTop = indexFromTop
		this.segment = this.container.nth(indexFromTop)
		this.ready = expect(
			this.segment,
			`journey segment in position ${indexFromTop + 1} (counting from top) should be visible`
		)
			.toBeVisible()
			.then(() => this)
	}

	private readonly container = this.page.locator(
		'table.rails-search-table c-lwc-rail-search-result-journey c-lwc-rail-search-result-segment'
	)
	private readonly expandButton = () =>
		this.segment
			.getByRole('cell', { name: 'expand' })
			.locator('svg')
			.describe(`expand button of journey segment in position ${this.indexFromTop + 1} (counting from top)`)
	private readonly fareGroup = (name: string) =>
		this.segment
			.locator('c-lwc-rail-search-fare-group')
			.filter({ hasText: name })
			.describe(`fare group with name ${name}`)
	private readonly railFare = (group: string, fare: string) =>
		this.fareGroup(group)
			.locator('c-lwc-rail-search-fare')
			.filter({ hasText: fare })
			.describe(`rail fare with name ${fare} in group ${group}`)

	@step
	async expand() {
		await this.expandButton().click()
	}

	@step
	async setFare(using: { group: string; fare: string }) {
		await expect(
			this.railFare(using.group, using.fare),
			`rail fare with name ${using.fare} in group ${using.group} should be visible`
		).toBeVisible()
		await this.railFare(using.group, using.fare).locator('.fare-selection-radio').click()
		await expect(
			this.railFare(using.group, using.fare).getByRole('radio'),
			`rail fare with name ${using.fare} in group ${using.group} should be checked`
		).toBeChecked()
	}
}
