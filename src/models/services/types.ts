import { FluentInterface } from '../types'
import { EmailService } from './email-service'
import { SalesforceService } from './salesforce-service'

export type SalesforceServiceObjectModel<T extends FluentInterface<SalesforceService>> = {
	api: T
}

export type EmailServiceObjectModel<T extends FluentInterface<EmailService>> = {
	email: T
}
