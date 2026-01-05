import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class ItineraryPassengerAllocationPage extends SalesforcePage {
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.header, 'passenger allocation tab should be visible')
			.toBeVisible()
			.then(() => this)
	}

	private readonly header = this.page.getByText('Passenger Allocations', { exact: true })
	private readonly table = {
		allocation: this.page.locator('th.allocation'),
		allocationFull: this.page.locator('th.allocation.full'),
		allocationUnderflow: this.page.locator('th.allocation.underflow'),
		allocationOverflow: this.page.locator('th.allocation.overflow'),
	}

	@step
	async getAllocations() {
		return this.table.allocation.all()
	}

	@step
	async getUnderflowAllocations() {
		return this.table.allocationUnderflow.all()
	}

	@step
	async getOverflowAllocations() {
		return this.table.allocationOverflow.all()
	}
}
