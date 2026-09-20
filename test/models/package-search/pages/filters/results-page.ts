import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../src/runners/step'
import { PackageSearchResultsRow } from './results-row'

export class PackageSearchResultsPage extends SalesforcePage {
	@step
	async selectRow(rowNumber: number) {
		return new PackageSearchResultsRow(this.page, rowNumber - 1).ready
	}
}
