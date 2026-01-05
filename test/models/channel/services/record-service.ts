import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { step } from '../../../runners/custom-test-runner'
import { Record } from 'jsforce'

export class ChannelRecordService extends SalesforceService {
	@step
	async getByName(name: string) {
		const soql = `SELECT FIELDS(ALL) FROM PackageNamespace__Channel__c WHERE Name = '${name}' LIMIT 1`
		try {
			return await this.api.query(soql, true).then((result) => result.records as Record[])
		} catch (error) {
			throw new Error(`failed fetching channel records by name ${name} due to:\n${error}`)
		}
	}
}
