import { Price } from './tab-builder'

export class Quote {
	private readonly pricePattern = /[A-Z]{3}[\s\S]*?(\d+(?:\.\d+)?)/

	getPrice(text: string) {
		try {
			const match = text.match(this.pricePattern)
			if (match && match[0] && match[1])
				return {
					currency: match[0],
					amount: parseFloat(match[1]),
				} as Price
			else throw new Error(`unable to parse Price using pattern ${this.pricePattern}`)
		} catch (error) {
			throw new Error(`parsing Price from ${text}\n${error}`)
		}
	}
}
