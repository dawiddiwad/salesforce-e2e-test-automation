import { expect, Locator, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../../runners/custom-test-runner'
import { SegmentPage } from './segment-page'

export class JourneyPage extends SalesforcePage {
	private readonly indexFromTop: number
	private journey: Locator
	readonly ready: Promise<this>

	constructor(page: Page, indexFromTop: number) {
		super(page)
		this.indexFromTop = indexFromTop
		this.journey = this.container.nth(indexFromTop)
		this.ready = expect(
			this.journey,
			`Journey in position ${indexFromTop + 1} (counting from top) should be visible`
		)
			.toBeVisible()
			.then(() => this)
	}

	private readonly container = this.page.locator('table.rails-search-table c-lwc-rail-search-result-journey')
	private readonly expandButton = () =>
		this.journey
			.getByRole('cell', { name: 'expand' })
			.locator('svg')
			.describe(`expand button of journey in position ${this.indexFromTop + 1} (counting from top)`)

	@step
	async expand() {
		await this.expandButton().click()
	}

	@step
	async getSegment(positionFromTop: number) {
		return new SegmentPage(this.page, --positionFromTop).ready
	}
}
