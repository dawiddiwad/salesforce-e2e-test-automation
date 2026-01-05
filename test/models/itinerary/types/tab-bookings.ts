export type Booking = {
	supplier: string
	name: string
}

export type BookingStatus =
	| 'Unconfirmed'
	| 'Confirmed'
	| 'Evaluated'
	| 'Booked Held'
	| 'Booked'
	| 'Skipped'
	| 'Confirmed Cancellation'

export type ConfirmationMethod = 'API' | 'Manual' | 'Email'

export type ConfirmationStatus = 'Unconfirmed' | 'Confirmed'

export type ConfirmationAction = 'Confirm' | 'Unconfirm' | 'Cancel'

export const StatusActionMap: Record<ConfirmationStatus, ConfirmationAction> = {
	Unconfirmed: 'Unconfirm',
	Confirmed: 'Confirm',
}

export const ActionStatusMap: Record<ConfirmationAction, ConfirmationStatus> = {
	Confirm: 'Confirmed',
	Unconfirm: 'Unconfirmed',
	Cancel: 'Unconfirmed',
}
