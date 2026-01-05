import { step } from '../../../runners/custom-test-runner'
import { CustomSettingsService } from './custom-settings-service'

export class AppSettingsService extends CustomSettingsService {
	protected readonly customSetting = {
		apiName: 'PackageNamespace__AppSettings__c',
		field: {
			passengerToContactFlow: 'PackageNamespace__PassengerToContactFlow__c',
			contactToPassengerFlow: 'PackageNamespace__ContactToPassengerFlow__c',
		},
	}

	@step
	async setPassengerToContactFlow(flow: string) {
		await this.set({
			field: this.customSetting.field.passengerToContactFlow,
			value: flow,
		})
	}

	@step
	async setContactToPassengerFlow(flow: string) {
		await this.set({
			field: this.customSetting.field.contactToPassengerFlow,
			value: flow,
		})
	}
}
