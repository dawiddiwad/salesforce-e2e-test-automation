import { faker } from '@faker-js/faker'

export class SpecificProjectNamingPolicy {
	static naming = {
		prefix: 'qa',
	}

	static email = {
		unique: () => `qa-sandbox-testing+${faker.string.uuid()}@example-company.com`,
	}
}
