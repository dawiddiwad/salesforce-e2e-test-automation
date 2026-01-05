import { SalesforcePage } from './pages/salesforce-page'
import { EmailService } from './services/email-service'
import { SalesforceService } from './services/salesforce-service'

export type SalesforceId = string

export type Actionable = SalesforcePage | SalesforceService | EmailService

export type FluentInterface<T extends Actionable> = {
	[key: string]: T | FluentInterface<T>
}
