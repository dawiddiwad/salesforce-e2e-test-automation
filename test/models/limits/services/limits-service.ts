import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { step } from '../../../runners/custom-test-runner'

export class LimitsService extends SalesforceService {
	@step
	async getRemainingDataStorageMB() {
		return this.api.connection.limits().then((limits) => limits['DataStorageMB']['Remaining'])
	}
}
