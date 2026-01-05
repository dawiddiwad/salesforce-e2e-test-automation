import { Record } from 'jsforce'
import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { SalesforceId } from '../../../../src/models/types'
import { step } from '../../../runners/custom-test-runner'

export class ItineraryRecordService extends SalesforceService {
	@step
	async getPriceLines(itineraryId: SalesforceId) {
		return this.api
			.query(
				`
            SELECT Id, PackageNamespace__EntryType__c, PackageNamespace__Value__c 
            FROM PackageNamespace__ItineraryPriceLine__c 
            WHERE PackageNamespace__ItineraryItem__r.PackageNamespace__Itinerary__r.Id = '${itineraryId}'
        `
			)
			.then((result) => result.records as Record[])
	}
}
