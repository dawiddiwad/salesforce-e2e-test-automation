export type CostingsColumn = 'Actions' | 'External Name' | 'Time' | 'Quantity' | CostingsPriceColumn

export type CostingsPriceColumn = 'Unit Cost' | 'Gross Price' | 'Unit Price'

export type PriceLinesColumn =
	| 'External Name'
	| 'Type'
	| 'Cost Price Source'
	| 'Supplier Cost'
	| 'Cost Total'
	| 'Supplier Commission'
	| 'Sales Price Source'
	| 'Markup'
	| 'Sell Total'
	| 'Reseller Commission'

export type PriceLinesRow = 'Amount' | 'Tax Amount'
