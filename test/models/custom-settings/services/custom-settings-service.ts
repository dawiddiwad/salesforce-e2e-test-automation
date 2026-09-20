import { expect } from '@playwright/test'
import { Record as SaleforceRecord } from 'jsforce'
import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { diagnostic } from '../../../../src/errors/redaction'

type CustomSetting = {
	apiName: string
	field: Record<string, string>
}

export abstract class CustomSettingsService extends SalesforceService {
	protected abstract readonly customSetting: CustomSetting

	protected async get() {
		let appSettings: SaleforceRecord[]
		try {
			appSettings = (await this.api.connection
				.sobject(this.customSetting.apiName)
				.find()
				.run()) as SaleforceRecord[]
		} catch (error) {
			throw diagnostic(`reading custom setting record for ${this.customSetting.apiName}`, error)
		}
		expect(
			appSettings.length,
			`single ${this.customSetting.apiName} record should be configured in custom settings`
		).toEqual(1)
		return appSettings[0] as SaleforceRecord
	}

	protected async set(custom: { field: string; value: string }) {
		try {
			const customSetting = await this.get()
			if (customSetting[custom.field] === custom.value) return
			else
				await this.api.update(this.customSetting.apiName, {
					Id: customSetting.Id,
					[custom.field]: custom.value,
				})
		} catch (error) {
			throw diagnostic(`setting ${custom.field} of custom setting ${this.customSetting.apiName}`, error)
		}
	}
}
