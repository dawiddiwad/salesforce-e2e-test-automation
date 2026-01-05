import { faker } from '@faker-js/faker'
import { Channel } from '../../../models/itinerary/types/itinerary'

export const shared = {
	channel: <Channel>'QA Email Channel',
	account: 'QA Email Account',
	contact: 'Email Payment Confirmation',
	email: (() => {
		const newAddress = () => `qa-sandbox-testing+${faker.string.uuid()}@example-company.com`
		return {
			address: newAddress(),
			reset: () => (shared.email.address = newAddress()),
		}
	})(),
}
