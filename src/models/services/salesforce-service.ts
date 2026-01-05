import { RestApiHandler } from '../../api/salesforce/rest-api-handler'

export abstract class SalesforceService {
	protected readonly api: RestApiHandler

	constructor(handler: RestApiHandler) {
		this.api = handler
	}

	protected async getRecordType(name: string) {
		try {
			const recordType = await this.api.connection.sobject('RecordType').findOne({ Name: name })
			if (!recordType) {
				throw new Error(`no record found`)
			} else return recordType
		} catch (error) {
			throw new Error(`fetching Record Type ${name}\n${error}`)
		}
	}
}
