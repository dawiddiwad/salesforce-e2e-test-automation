export type Itinerary = {
	type?: RecordType
	name?: string
	account: string
	contact: string
	channel: Channel
	start?: Date
	end?: Date
	size?: number
}

export type DefaultTab =
	| 'Details'
	| 'Builder'
	| 'Bookings'
	| '(Supplier) Bookings'
	| 'Costings'
	| 'Breakdowns'
	| 'Passengers'
	| 'Allocations'
	| 'Payments'
	| 'Documents'

export type BookingStatus = 'Confirmed' | 'Unconfirmed'

export type RecordType =
	| 'Amendment'
	| 'Booking'
	| 'Cancellation'
	| 'Designing'
	| 'Inactive Quote'
	| 'Price Model'
	| 'Quote'
	| 'Snapshot Booking'

export type Channel =
	| 'Tour Sales - Exclusive'
	| 'Tours Europe'
	| 'Tours USA'
	| 'Tours - Inclusive'
	| 'Tour Sales - Inclusive'
	| 'Orange Travel'
	| 'Orange Travel Germany'
	| 'QA Email Channel'
