import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { step } from '../../../runners/custom-test-runner'

export class ApiRegistryService extends SalesforceService {
	private readonly paymentSchedules = {
		PackageNamespace__Interface__c: 'PackageNamespace.PaymentSchedule',
		PackageNamespace__Implementation__c: 'PackageNamespace.PaymentScheduleImpl2',
	}

	@step
	async setDefaultPaymentSchedules() {
		const existingRegistry = await this.api.query(
			`
            SELECT Id 
            FROM PackageNamespace__APIRegistry__c 
            WHERE PackageNamespace__Interface__c = '${this.paymentSchedules.PackageNamespace__Interface__c}'
            AND PackageNamespace__Implementation__c = '${this.paymentSchedules.PackageNamespace__Implementation__c}'
        `,
			true
		)
		if (existingRegistry.totalSize) return
		else await this.api.create('PackageNamespace__APIRegistry__c', this.paymentSchedules)
	}
}
