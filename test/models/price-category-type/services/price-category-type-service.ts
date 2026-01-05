import { Record } from 'jsforce'
import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { step } from '../../../runners/custom-test-runner'

export class PriceCategoryTypeService extends SalesforceService {
	private async updateByLabel(label: string, data: Record) {
		try {
			const priceCategoryType = await this.api
				.query(
					`SELECT Id FROM PackageNamespace__PriceCategoryType__c WHERE PackageNamespace__Label__c = '${label}'`
				)
				.then((result) => result.records as Record[])
			if (priceCategoryType.length > 1) {
				throw new Error(`multiple price category types with label ${label} found`)
			}
			return await this.api.update('PackageNamespace__PriceCategoryType__c', {
				Id: priceCategoryType[0].Id,
				...data,
			})
		} catch (error) {
			throw new Error(`updating price category type\n${error}`)
		}
	}

	@step
	async enableAdvancedPriceSummaryForCabin() {
		try {
			return await this.updateByLabel('Cabin', { PackageNamespace__EnableAdvancedPriceSummary__c: true })
		} catch (error) {
			throw new Error(`enabling advanced price summary for cabin\n${error}`)
		}
	}
}
