export type Location = 'Europe' | 'Africa' | 'No Location'

type Accommodation =
	| 'Four Season Luxury'
	| 'Hotel Bazaar'
	| 'Hotel Cuatro Estaciones'
	| 'AB Test Hotel'
	| 'Hotel Test'
	| 'The Drake, Hilton Hotel'

type Activity = 'Cave Tours' | 'City Bus Tour'

type Flight = 'Brussels - Warsaw' | 'Warsaw - Barcelona'

type Transfer = 'TEST Transfer from Los Angeles Airport to Hotel'

type Promotion = 'CA Package'

export type ServiceCatalog = {
	Accommodation: Accommodation
	Activity: Activity
	Flight: Flight
	Transfer: Transfer
	Promotion: Promotion
}

export type BuilderColumn =
	| 'Days'
	| 'Location'
	| 'Service'
	| 'Price Category'
	| 'Add-on'
	| 'Start Date'
	| 'End Date'
	| 'Quantity'
	| 'Inventory'
	| 'Status'
	| 'Sell Price'

export type PriceCategory = {
	name: string
	price: Price
}

export type AddOn = PriceCategory & {
	startDate: string
	endDate: string
}

export type Price = {
	currency: string
	amount: number
}

export type Service<Type extends keyof ServiceCatalog> = {
	type: Type
	name: ServiceCatalog[Type]
}
