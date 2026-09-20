import { Record } from 'jsforce'
import { step } from '../../../../src/runners/step'
import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { RecordType } from '../types/account'

export class AccountRecordService extends SalesforceService {
	@step
	private async createNewUsing(recordType: RecordType, account: Record) {
		try {
			account = {
				RecordTypeId: await this.getRecordType(recordType).then((type) => type?.Id),
				...account,
			}
			return this.api.create('Account', account)
		} catch (error) {
			throw new Error(`creating ${recordType} Account`, { cause: error })
		}
	}

	@step
	async createNewHousehold(account: Record) {
		return this.createNewUsing(<RecordType>'Household', account)
	}

	@step
	async createNewPerson(account: Record) {
		return this.createNewUsing(<RecordType>'Person Account', account)
	}
}
