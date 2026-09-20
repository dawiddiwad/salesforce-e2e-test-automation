import type { Record } from 'jsforce'
import { RestApiHandler } from '../../api/salesforce/rest-api-handler'

export abstract class SalesforceService {
	protected readonly api: RestApiHandler

	constructor(handler: RestApiHandler) {
		this.api = handler
	}

	protected async getRecordType(name: string) {
		let recordType: Record | null
		try {
			recordType = await this.api.connection.sobject('RecordType').findOne({ Name: name })
		} catch {
			throw new Error(`fetching Record Type ${name}`)
		}
		if (!recordType) throw new Error(`no Record Type ${name} record found`)
		return recordType
	}
}
