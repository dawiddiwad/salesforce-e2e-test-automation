import { faker } from '@faker-js/faker'
import { SpecificProjectNamingPolicy } from '../../../policies/specific-project'
import { GeneralNamingPolicy } from '../../../policies/general'
import { SalesforceId } from '../../../../src/models/types'

export const common = {
	trip: {
		name: `${SpecificProjectNamingPolicy.naming.prefix} test trip ${GeneralNamingPolicy.randomId()}`,
		channelAVCA: 'Amtrak Vacations Canada - Direct',
		channelAVNZ: 'Amtrak Vacations NZ - Travel Agent',
		channelAVUS: 'Amtrak Vacations US - Travel Agent',
	},
	personAccount: {
		name: () => `${common.personAccount.firstName} ${common.personAccount.lastName}`,
		firstName: `${SpecificProjectNamingPolicy.naming.prefix} firstname ${GeneralNamingPolicy.randomId()}`,
		lastName: `${SpecificProjectNamingPolicy.naming.prefix} lastname ${GeneralNamingPolicy.randomId()}`,
		age: 99,
	},
	TA: {
		accountName: 'Test Agency - US/CA/AU/UK/NZ',
		id: '' as SalesforceId,
	},
	birthDate: () => faker.date.between({ from: '1970-01-01', to: '1990-12-31' }),
	passengerData: () => {
		return {
			firstName: `${SpecificProjectNamingPolicy.naming.prefix} firstname ${GeneralNamingPolicy.randomId()}`,
			lastName: `${SpecificProjectNamingPolicy.naming.prefix} lastname ${GeneralNamingPolicy.randomId()}`,
			dateOfBirth: Intl.DateTimeFormat('en-US').format(common.birthDate()),
		}
	},
	passengers: () => {
		return {
			firstPassenger: common.passengerData(),
			secondPassenger: common.passengerData(),
			thirdPassenger: common.passengerData(),
			fourthPassenger: common.passengerData(),
		}
	},
	randomPhoneNumber: () => faker.phone.number({ style: 'international' }),
	randomEmail: () => faker.internet.email(),
	accesibleEmail: `qa-sandbox-testing+${faker.string.uuid()}@example-company.com`,
	itineraryRecords: [] as SalesforceId[],
}
