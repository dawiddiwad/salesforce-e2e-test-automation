import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { PackageSearchAvailabilityRow } from './availability-row'

export class PackageSearchAvailabilityPage extends SalesforcePage {
	@step
	async selectRow(rowNumber: number) {
		return new PackageSearchAvailabilityRow(this.page, --rowNumber).ready
	}
}
