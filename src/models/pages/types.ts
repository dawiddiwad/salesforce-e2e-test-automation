import { FluentInterface } from '../types'
import { SalesforcePage } from './salesforce-page'

export type SalesforcePageObjectModel<T extends FluentInterface<SalesforcePage>> = {
	ui: T
}
