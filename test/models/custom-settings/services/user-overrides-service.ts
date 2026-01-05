import { step } from '../../../runners/custom-test-runner'
import { CustomSettingsService } from './custom-settings-service'

export class UserOverridesService extends CustomSettingsService {
	protected readonly customSetting = {
		apiName: 'PackageNamespace__UserSetting__c',
		field: {
			pilotFeatures: 'PackageNamespace__PilotFeatures__c',
		},
	}

	@step
	async setPilotFeatures(features: string[]) {
		await this.set({
			field: this.customSetting.field.pilotFeatures,
			value: features.join(';'),
		})
	}
}
