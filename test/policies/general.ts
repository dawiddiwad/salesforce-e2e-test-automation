import { faker } from '@faker-js/faker'

export class GeneralNamingPolicy {
	static randomId() {
		return faker.string.alpha({ length: 3, casing: 'mixed' })
	}

	static uniqueName() {
		return `${faker.person.lastName()}-${GeneralNamingPolicy.randomId()}`
	}

	static uniqueBuzz() {
		return `${faker.lorem.word()} ${faker.lorem.word()} ${GeneralNamingPolicy.randomId()}`
	}

	static shortText() {
		return faker.lorem.paragraph()
	}
}
