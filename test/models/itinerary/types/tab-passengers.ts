export type PassengersColumn =
	| 'Salutation'
	| 'First Name'
	| 'Last Name'
	| 'Room Group Id'
	| 'Channel Role'
	| 'Person Account'
	| 'Date of Birth'
	| 'Gender'
	| 'Age'
	| 'Email'
	| 'Comment'
	| 'PGIs'

export type ItineraryGroup = {
	name: string
	primaryPassenger: string
	otherPassenger?: string
}
