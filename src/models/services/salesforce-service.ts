import type { Record } from 'jsforce'
import { RestApiHandler } from '../../api/salesforce/rest-api-handler'
import { diagnostic } from '../../errors/redaction'

export abstract class SalesforceService {
	protected readonly api: RestApiHandler

	constructor(handler: RestApiHandler) {
		this.api = handler
	}

	protected async getRecordType(name: string) {
		let recordType: Record | null
		try {
			recordType = await this.api.connection.sobject('RecordType').findOne({ Name: name })
		} catch (error) {
			throw diagnostic(`fetching Record Type ${name}`, error)
		}
		if (!recordType) throw new Error(`no Record Type ${name} record found`)
		return recordType
	}
}
