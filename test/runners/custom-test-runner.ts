import { mergeTests, test as base } from '@playwright/test'
import { allEmailServices, allSalesforceServices, EmailServices, SalesforceServices } from '../models/services'
import { SalesforcePages, allSalesforcePages } from '../models/pages'
import { SalesforceServiceObjectModel, EmailServiceObjectModel } from '../../src/models/services/types'
import { SalesforcePageObjectModel } from '../../src/models/pages/types'
import { DefaultSalesforceCliUser } from '../../src/users/default-salesforce-cli-users'

const testSalesforceUiCatalog = base.extend<SalesforcePageObjectModel<SalesforcePages>>({
	ui: async ({ page }, use) => {
		const actor = await new DefaultSalesforceCliUser().ready.then((user) => user.setUi(page))
		return use({ ...allSalesforcePages(actor.ui) })
	},
})

const testSalesforceApiCatalog = base.extend<SalesforceServiceObjectModel<SalesforceServices>>({
	// eslint-disable-next-line no-empty-pattern
	api: async ({}, use) => {
		const actor = await new DefaultSalesforceCliUser().ready.then((user) => user.setApi('default'))
		return use({ ...allSalesforceServices(actor.api) })
	},
})

const testSalesforceDefaultActor = base.extend<{ actor: DefaultSalesforceCliUser }>({
	actor: async ({ page }, use) =>
		use(
			await new DefaultSalesforceCliUser().ready
				.then((user) => user.setApi('default'))
				.then((user) => user.setUi(page))
		),
})

const testEmailApiCatalog = base.extend<EmailServiceObjectModel<EmailServices>>({
	// eslint-disable-next-line no-empty-pattern
	email: async ({}, use) => {
		return use({ ...allEmailServices() })
	},
})

export const test = mergeTests(
	testSalesforceUiCatalog,
	testSalesforceApiCatalog,
	testSalesforceDefaultActor,
	testEmailApiCatalog
)

export function step<This, Args extends unknown[], Return>(
	target: (this: This, ...args: Args) => Return,
	context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) {
	return function (this: This, ...args: Args): Return {
		const formatMethodName = (name: string) =>
			name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^([a-z])/, (match) => match.toUpperCase())

		const formatMethodArguments = (args: unknown[]) =>
			args
				.map((arg) => {
					if (Array.isArray(arg)) {
						return `[${arg.join(', ')}]`
					} else if (typeof arg === 'object' && arg !== null) {
						return JSON.stringify(arg, null, 2)
					} else {
						return String(arg)
					}
				})
				.join(', ')
				.replaceAll(String(undefined), 'any')

		const methodName = formatMethodName(String(context.name))
		const formattedArguments = args.length ? ` : ${formatMethodArguments(args)}` : ''
		const className = (this as object).constructor.name
		const stepName = `${className} > ${methodName}${formattedArguments}`

		return test.step(stepName, async () => target.call(this, ...args), { box: true }) as Return
	}
}
