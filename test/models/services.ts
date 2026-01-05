import { RestApiHandler } from '../../src/api/salesforce/rest-api-handler'
import { EmailService } from '../../src/models/services/email-service'
import { SalesforceService } from '../../src/models/services/salesforce-service'
import { FluentInterface } from '../../src/models/types'
import { AccountRecordService } from './account/services/record-service'
import { ApiRegistryService } from './api-registry/services/api-registry-service'
import { ChannelRecordService } from './channel/services/record-service'
import { AppSettingsService } from './custom-settings/services/app-settings-service'
import { UserOverridesService } from './custom-settings/services/user-overrides-service'
import { GmailService } from './email/services/gmail'
import { ItineraryRecordService } from './itinerary/services/record-service'
import { LimitsService } from './limits/services/limits-service'
import { PriceCategoryTypeService } from './price-category-type/services/price-category-type-service'
import { StorageCleanupService } from './record-cleanup/services/storage-cleanup-service'
import { UserSerivce } from './user/services/user-service'
import { ExternalCredentialsService } from './named-credentials/services/external-credentials'

export type SalesforceServices = ReturnType<typeof allSalesforceServices>
export const allSalesforceServices = (api: RestApiHandler) =>
	({
		account: {
			record: new AccountRecordService(api),
		},
		apiRegistry: new ApiRegistryService(api),
		appSettings: new AppSettingsService(api),
		userOverrides: new UserOverridesService(api),
		itinerary: {
			record: new ItineraryRecordService(api),
		},
		limits: new LimitsService(api),
		storage: {
			cleanup: new StorageCleanupService(api),
		},
		user: new UserSerivce(api),
		priceCategoryType: new PriceCategoryTypeService(api),
		credential: {
			external: new ExternalCredentialsService(api),
		},
		channel: {
			record: new ChannelRecordService(api),
		},
	}) satisfies FluentInterface<SalesforceService>

export type EmailServices = ReturnType<typeof allEmailServices>
export const allEmailServices = () =>
	({
		gmail: new GmailService(),
	}) satisfies FluentInterface<EmailService>
