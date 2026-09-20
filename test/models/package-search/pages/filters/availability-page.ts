import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../src/runners/step'
import { PackageSearchAvailabilityRow } from './availability-row'

export class PackageSearchAvailabilityPage extends SalesforcePage {
	@step
	async selectRow(rowNumber: number) {
		return new PackageSearchAvailabilityRow(this.page, rowNumber - 1).ready
	}
}
