import { expect } from '@playwright/test'
import { childRecords, fake } from './support/test-data'
import { test } from '../../runners/custom-test-runner'
import { GeneralNamingPolicy } from '../../policies/general'
import { BookingStatus, RecordType } from '../../models/itinerary/types/itinerary'

test.describe.parallel('e2e suite', async () => {
	const shared = fake.itineraryRecords()

	test.beforeEach(async ({ ui }) => {
		await test.step('open qa app', async () => {
			await ui.navigator.openApp('QA')
		})
	})

	test('itinerary flow', { tag: ['@TA-11780'] }, async ({ actor, ui }) => {
		await test.step('open itinerary tab and start creating a new quote record', async () => {
			await ui.navigator.openTab('Itineraries')
			await ui.itinerary.tab.startCreatingNewRecord('Quote')
		})

		await test.step('fill mandatory fields and save', async () => {
			await ui.itinerary.record.edit.fillAccountLookup(shared.accountName)
			await ui.itinerary.record.edit.fillContactLookup(shared.contactName)
			await ui.itinerary.record.edit.fillName()
			await ui.itinerary.record.edit.fillDates()
			await ui.itinerary.record.edit.fillGroupSize()
			await ui.itinerary.record.edit.selectChannel('Tours Europe')
			await ui.itinerary.record.edit.saveChanges()
		})

		await test.step('check tabs and fields', async () => {
			const tabVisibilityChecks = [
				expect
					.soft(await ui.itinerary.record.details.getTab('Details'), 'check Details tab is visible')
					.toBeVisible(),
				expect
					.soft(await ui.itinerary.record.details.getTab('Builder'), 'check Builder tab is visible')
					.toBeVisible(),
				expect
					.soft(await ui.itinerary.record.details.getTab('Bookings'), 'check Bookings tab is visible')
					.toBeVisible(),
			]

			const fieldValueChecks = [
				expect
					.soft(await ui.itinerary.record.details.getBookingStatus(), 'check Booking status')
					.toEqual(<BookingStatus>'Unconfirmed'),
				expect
					.soft(await ui.itinerary.record.details.getRecordType(), 'check Record Type')
					.toEqual(<RecordType>'Quote'),
				expect
					.soft(await ui.itinerary.record.details.getNameOnBooking(), 'check Name on Booking')
					.toEqual(shared.contactName),
			]

			await expect(
				async () => await Promise.all([...tabVisibilityChecks, ...fieldValueChecks]),
				'itinerary should have correct data'
			).toPass({ timeout: 2 * 60000 })
		})

		await test.step('open builder tab and set primary locations', async () => {
			await ui.itinerary.record.details.openTab('Builder')
			await ui.itinerary.builder.setPrimaryLocations(['Europe', 'Africa'])
		})

		await test.step('add accommodation service line', async () => {
			await ui.itinerary.builder
				.addLine()
				.then((line) => line.setService({ type: 'Accommodation', name: 'Hotel Bazaar' }))
		})

		await test.step('save line', async () => {
			await ui.itinerary.builder.saveChanges()
		})

		await test.step('add activity service line', async () => {
			await ui.itinerary.builder
				.addLine()
				.then((line) => line.setService({ type: 'Activity', name: 'Cave Tours' }))
		})

		await test.step('add flight service line', async () => {
			await ui.itinerary.builder
				.addLine()
				.then((line) => line.setService({ type: 'Flight', name: 'Brussels - Warsaw' }))
		})

		await test.step('save lines and check prices', async () => {
			await ui.itinerary.builder.saveChanges()
			expect
				.soft(
					await ui.itinerary.builder.getLine(1).then((line) => line.read('Sell Price')),
					'check Flight Sell Price'
				)
				.toContain('165.00')
			expect
				.soft(
					await ui.itinerary.builder.getLine(2).then((line) => line.read('Sell Price')),
					'check Activity Sell Price'
				)
				.toContain('33.00')
			expect
				.soft(
					await ui.itinerary.builder.getLine(3).then((line) => line.read('Sell Price')),
					'check Accomodation Sell Price'
				)
				.toContain('55.00')
		})

		await test.step('open costings tab and select to edit total cost for flight', async () => {
			await ui.itinerary.record.details.openTab('Costings')
			await ui.itinerary.costings.filterLinesByRecordType('Flight')
			await ui.itinerary.costings.getCostingsLine(1).then((line) => line.editPriceColumn('Gross Price'))
			await ui.itinerary.costings
				.getPriceLine('Amount')
				.then((line) => line.setColumn('Supplier Cost', 2000))
				.then((modal) => modal.saveAllChanges())
			expect
				.soft(await ui.itinerary.costings.getCostingsLine(1).then((line) => line.readColumn('Unit Cost')))
				.toContain('1,100.00')
		})

		await test.step('open passengers tab and fill data for each', async () => {
			await ui.itinerary.record.details.openTab('Passengers')
			await ui.itinerary.passengers.getLine(1).then(async (line) => {
				await line.set('First Name', shared.firstPassenger.firstName)
				await line.set('Last Name', shared.firstPassenger.lastName)
				await line.set('Date of Birth', shared.firstPassenger.dateOfBirth)
			})
			await ui.itinerary.passengers.getLine(2).then(async (line) => {
				await line.set('First Name', shared.secondPassenger.firstName)
				await line.set('Last Name', shared.secondPassenger.lastName)
				await line.set('Date of Birth', shared.secondPassenger.dateOfBirth)
			})
			await ui.itinerary.passengers.saveChanges()
		})

		await test.step('add itinerary group for passengers', async () => {
			await ui.itinerary.passengers.openManageItineraryGroups().then(async (modal) => {
				await modal.addGroup({
					name: GeneralNamingPolicy.uniqueName(),
					primaryPassenger: shared.firstPassenger.fullName(),
					otherPassenger: shared.secondPassenger.fullName(),
				})
				await modal.saveGroups()
			})
		})

		await test.step('convert itinerary to booking', async () => {
			await ui.itinerary.record.details.convertToBooking()
			await expect(
				await ui.itinerary.record.details.getBooking(),
				'Booking checkbox should be checked'
			).toBeChecked()
		})

		await test.step('get primary booking child records', async () => {
			shared.primaryRecords = await ui.itinerary.record.details.using(actor.api).map(childRecords).getRecords()
		})

		await test.step('create itinerary amendment', async () => {
			await ui.itinerary.record.details.createAmendment()
		})

		await test.step('get amendment child records', async () => {
			shared.amendmentRecords = await ui.itinerary.record.details.using(actor.api).map(childRecords).getRecords()
		})

		await test.step('compare amendment data with primary booking', async () => {
			ui.itinerary.record.details
				.using(actor.api)
				.map(childRecords)
				.compare(shared.primaryRecords, shared.amendmentRecords)
		})

		await test.step('add *30 Item Itinerary* template on the builder', async () => {
			await ui.itinerary.record.details.openTab('Builder')
			await ui.itinerary.builder.getLine(1).then((line) => line.addTemplate('30 Item Itinerary'))
			await ui.itinerary.builder.saveChanges()
		})

		await test.step('get amendment child records', async () => {
			shared.amendmentRecords = await ui.itinerary.record.details.using(actor.api).map(childRecords).getRecords()
		})

		await test.step('merge amendment', async () => {
			await ui.itinerary.record.details.openTab('Details')
			await ui.itinerary.record.details.mergeAmendment()
		})

		await test.step('get merged primary booking child records', async () => {
			shared.primaryRecords = await ui.itinerary.record.details.using(actor.api).map(childRecords).getRecords()
		})

		await test.step('compare primary booking with amendment', async () => {
			ui.itinerary.record.details
				.using(actor.api)
				.map(childRecords)
				.compare(shared.primaryRecords, shared.amendmentRecords)
		})
	})
})
