import { expect } from '@playwright/test'
import { test } from '../../runners/custom-test-runner'
import { common } from './support/test-data'
import { Record } from 'jsforce'
import { SalesforceId } from '../../../src/models/types'

test.describe('specific project e2e regression', async () => {
	test.beforeEach(async ({ ui }) => {
		await ui.navigator.openApp('Travel Sales')
	})

	test.afterEach('cleanup booking confirmations on itineraries', async ({ ui }) => {
		for (const itinerary of common.itineraryRecords) {
			await ui.navigator.goto(itinerary)
			await ui.itinerary.record.details.openTab('(Supplier) Bookings')
			await ui.itinerary.bookings.unconfirmManualServices()
			await ui.itinerary.bookings.unconfirmEmailServices()
			await ui.itinerary.bookings.cancelApiServices()
		}
	})

	test('Test AVCA Direct - full uat', { tag: ['@TA-13401', '@sp'] }, async ({ api, ui }) => {
		await test.step('create person account', async () => {
			await api.account.record.createNewPerson({
				FirstName: common.personAccount.firstName,
				LastName: common.personAccount.lastName,
				PackageNamespace__Age__c: common.personAccount.age,
				Phone: common.randomPhoneNumber(),
				PersonEmail: common.randomEmail(),
				Channels__c: common.trip.channelAVCA,
			})
		})
		await test.step('create trip', async () => {
			await ui.navigator.openTab('Trips')
			await ui.trip.tab.createNewRecord()
			await ui.trip.record.edit.selectChannel(common.trip.channelAVCA)
			await ui.trip.record.edit.selectAccount(common.personAccount.name())
			await ui.trip.record.edit.setTripName(common.trip.name)
			await ui.trip.record.edit.setGroupSize('1')
			await ui.trip.record.edit.setTravelStartDate('TODAY')
			await ui.trip.record.edit.setCurrencyIsoCode('CAD')
			await ui.trip.record.edit.saveChanges()
		})
		await test.step('create itinerary using package search', async () => {
			await ui.trip.record.details.openPackageSearch()
			await ui.packageSearch.filters.setPackageName('Scenic America by Rail with the Grand Canyon')
			await ui.packageSearch.filters.setDatesNextMonth(5)
			await ui.packageSearch.filters.setDefaultRooms(1)
			await ui.packageSearch.filters.setEnabledRoomOccupancy({ room: 1, adults: 3, children: 1 })
			await ui.packageSearch.filters.searchPackagesResults()
			await ui.packageSearch.results.resultsTab.selectRow(1).then(async (row) => {
				await row.addPackageToItinerary()
			})
			common.itineraryRecords.push(await ui.itinerary.record.details.getRecordId())
		})
		await test.step('add hotel', async () => {
			await ui.itinerary.record.details.openTab('Builder')
			await ui.itinerary.builder.addLine()
			await ui.itinerary.builder.getLine(1).then(async (line) => {
				await line.setService({ type: 'Accommodation', name: 'Hotel Test' })
			})
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('change duration of stay', async () => {
			await ui.itinerary.builder.getLine(8).then(async (line) => {
				await line.changeAccomodationDates({ days: 1, impactSubsequentServices: true })
			})
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('change departure time and class of travel', async () => {
			const railSearch = await ui.itinerary.builder.getLine(17).then((line) => line.openRailSearch())
			await railSearch.setCalendarSliderDay('next')
			const _1st_journey = await railSearch.getJourney(1)
			await _1st_journey.expand()
			const _2nd_segment = await _1st_journey.getSegment(2)
			await _2nd_segment.expand()
			await _2nd_segment.setFare({ group: 'Sleepers', fare: 'Bedroom' })
			await railSearch.updateItinerary()
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('add transfer', async () => {
			const transferLine = await ui.itinerary.builder.getLine(19).then((line) => line.addLineBelow())
			await transferLine.setService({ type: 'Transfer', name: 'TEST Transfer from Los Angeles Airport to Hotel' })
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('add promotion', async () => {
			const promotionLine = await ui.itinerary.builder.addLine('using + Add New service button')
			await promotionLine.setLocation('No Location')
			await promotionLine.setService({ type: 'Promotion', name: 'CA Package' })
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('check passenger allocations', async () => {
			await ui.itinerary.record.details.openTab('Passengers')
			const passengerTab = await ui.itinerary.passengers.openPassengerAllocationTab()
			await expect(async () => {
				expect(
					await passengerTab.getAllocations(),
					'there should be at least 1 passenger allocation'
				).not.toHaveLength(0)
				expect(
					await passengerTab.getOverflowAllocations(),
					'there should be no overflow passenger allocations'
				).toHaveLength(0)
			}, 'passenger allocations should be correct').toPass({ timeout: 60_000 })
		})
		await test.step('send quote document', async () => {
			await ui.itinerary.record.details.openTab('Documents')
			await ui.itinerary.documents.openItineraryContentTab()
			const itineraryContent = await ui.itinerary.documents.startCreatingNewContent()
			await itineraryContent.selectTemplate('Quote without Commission AVCA')
			const itineraryContentWizard = await itineraryContent.saveChangesAndOpenWizard()
			await itineraryContentWizard.advanceToStage('Your Destination(s)')
			const customerPreview = await itineraryContentWizard.saveAndPreview()
			const emailComposer = await customerPreview.sendAndPublish()
			await emailComposer.setTo()
			await emailComposer.send()
		})
		await test.step('add task', async () => {
			const taskEdit = await ui.itinerary.record.details.startAddingTask()
			await taskEdit.setSubject('Call')
			await taskEdit.setDueDate('TOMORROW', 'en-US')
			await taskEdit.save()
		})
		await test.step('add passenger details', async () => {
			await ui.itinerary.record.details.openTab('Passengers')
			await ui.itinerary.passengers.getLine(1).then(async (_1st_passenger) => {
				await expect(
					await _1st_passenger.get('First Name'),
					'first passenger first name should be defined'
				).not.toContainText('tbd', { ignoreCase: true })
				await expect(
					await _1st_passenger.get('Last Name'),
					'first passenger last name should be defined'
				).not.toContainText('traveller', { ignoreCase: true })
				await expect(
					await _1st_passenger.get('Person Account'),
					'first passenger person account should be defined'
				).not.toBeEmpty()
				await _1st_passenger.set('Date of Birth', common.passengers().firstPassenger.dateOfBirth)
			})
			await ui.itinerary.passengers.getLine(2).then(async (_2nd_passenger) => {
				await _2nd_passenger.set('First Name', common.passengers().secondPassenger.firstName)
				await _2nd_passenger.set('Last Name', common.passengers().secondPassenger.lastName)
				await _2nd_passenger.set('Date of Birth', common.passengers().secondPassenger.dateOfBirth)
			})
			await ui.itinerary.passengers.getLine(3).then(async (_3rd_passenger) => {
				await _3rd_passenger.set('First Name', common.passengers().thirdPassenger.firstName)
				await _3rd_passenger.set('Last Name', common.passengers().thirdPassenger.lastName)
				await _3rd_passenger.set('Date of Birth', common.passengers().thirdPassenger.dateOfBirth)
			})
			await ui.itinerary.passengers.getLine(4).then(async (_4th_passenger) => {
				await _4th_passenger.set('First Name', common.passengers().fourthPassenger.firstName)
				await _4th_passenger.set('Last Name', common.passengers().fourthPassenger.lastName)
				await _4th_passenger.set('Date of Birth', common.passengers().fourthPassenger.dateOfBirth)
			})
			await ui.itinerary.passengers.saveChanges()
		})
		await test.step('confirm api services on bookings tab', async () => {
			await ui.itinerary.record.details.openTab('(Supplier) Bookings')
			await ui.itinerary.bookings.confirmManualServices()
			await ui.itinerary.bookings.confirmEmailServices()
			await ui.itinerary.bookings.confirmApiServices()
		})
		await test.step('convert to booking', async () => {
			await ui.itinerary.record.details.convertToBooking()
			await ui.itinerary.record.details.openTab('Details')
			await expect(
				await ui.itinerary.record.details.getBooking(),
				'Booking checkbox should be checked'
			).toBeChecked()
		})
		await test.step('take payment', async () => {
			await ui.itinerary.record.details.openTab('Payments')
			await ui.itinerary.payments.makePayment({
				payerName: common.personAccount.name(),
				paymentInfo: 'test payment - please ignore',
				payerEmail: common.accesibleEmail,
			})
		})
	})

	test('Test AVNZ TA - full uat', { tag: ['@sp'] }, async ({ ui, actor }) => {
		await test.step('get TA account Id', async () => {
			common.TA.id = await actor.api
				.query(`SELECT Id FROM Account WHERE Name = 'Test Agency - US/CA/AU/UK/NZ'`)
				.then((result) => result.records[0] as Record)
				.then((record) => record.Id as SalesforceId)
		})
		await test.step('create TA contact', async () => {
			await actor.api.create('Contact', {
				LastName: common.personAccount.lastName,
				FirstName: common.personAccount.firstName,
				Phone: common.randomPhoneNumber(),
				Email: common.randomEmail(),
				AccountId: common.TA.id,
			})
		})
		await test.step('create trip', async () => {
			await ui.navigator.openTab('Trips')
			await ui.trip.tab.createNewRecord()
			await ui.trip.record.edit.selectChannel(common.trip.channelAVNZ)
			await ui.trip.record.edit.selectAccount(common.TA.accountName)
			await ui.trip.record.edit.setTripName(common.trip.name)
			await ui.trip.record.edit.setGroupSize('1')
			await ui.trip.record.edit.setTravelStartDate('TODAY')
			await ui.trip.record.edit.setCurrencyIsoCode('NZD')
			await ui.trip.record.edit.saveChanges()
		})
		await test.step('create itinerary using package search', async () => {
			await ui.trip.record.details.openPackageSearch()
			await ui.packageSearch.filters.setPackageName('USA and Canada Rail Experience Roundtrip from Chicago')
			await ui.packageSearch.filters.setDatesNextMonth(5)
			await ui.packageSearch.filters.setDefaultRooms(1)
			await ui.packageSearch.filters.setEnabledRoomOccupancy({ room: 1, adults: 1, children: 0 })
			await ui.packageSearch.filters.searchPackagesResults()
			await ui.packageSearch.results.resultsTab.selectRow(3).then(async (row) => {
				await row.addPackageToItinerary()
			})
			common.itineraryRecords.push(await ui.itinerary.record.details.getRecordId())
		})
		await test.step('add hotel', async () => {
			await ui.itinerary.record.details.openTab('Builder')
			await ui.itinerary.builder.addLine()
			await ui.itinerary.builder.getLine(1).then(async (line) => {
				await line.setService({ type: 'Accommodation', name: 'The Drake, Hilton Hotel' })
			})
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('change duration of stay', async () => {
			await ui.itinerary.builder.getLine(8).then(async (line) => {
				await line.changeAccomodationDates({ days: 1, impactSubsequentServices: true })
			})
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('change departure time and class of travel', async () => {
			const railSearch = await ui.itinerary.builder.getLine(14).then((line) => line.openRailSearch())
			await railSearch.setCalendarSliderDay('next')
			const _1st_journey = await railSearch.getJourney(2)
			await _1st_journey.expand()
			const _2nd_segment = await _1st_journey.getSegment(2)
			await _2nd_segment.expand()
			await _2nd_segment.setFare({ group: 'Sleepers', fare: 'Bedroom' })
			await railSearch.updateItinerary()
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('add promotion', async () => {
			const promotionLine = await ui.itinerary.builder.addLine('using + Add New service button')
			await promotionLine.setLocation('No Location')
			await promotionLine.setService({ type: 'Promotion', name: 'CA Package' })
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('check passenger allocations', async () => {
			await ui.itinerary.record.details.openTab('Passengers')
			const passengerTab = await ui.itinerary.passengers.openPassengerAllocationTab()
			await expect(async () => {
				expect(
					await passengerTab.getAllocations(),
					'there should be at least 1 passenger allocation'
				).not.toHaveLength(0)
				expect(
					await passengerTab.getOverflowAllocations(),
					'there should be no overflow passenger allocations'
				).toHaveLength(0)
			}, 'passenger allocations should be correct').toPass({ timeout: 60_000 })
		})
		await test.step('send quote document', async () => {
			await ui.itinerary.record.details.openTab('Documents')
			await ui.itinerary.documents.openItineraryContentTab()
			const itineraryContent = await ui.itinerary.documents.startCreatingNewContent()
			await itineraryContent.selectTemplate('Quote AV TA with Commission')
			const customerPreview = await itineraryContent.saveChangesAndOpenPreview()
			const emailComposer = await customerPreview.sendAndPublish()
			await emailComposer.setTo()
			await emailComposer.send()
		})
		await test.step('add task', async () => {
			const taskEdit = await ui.itinerary.record.details.startAddingTask()
			await taskEdit.setSubject('Call')
			await taskEdit.setDueDate('TOMORROW', 'en-US')
			await taskEdit.save()
		})
		await test.step('add passenger details', async () => {
			await ui.itinerary.record.details.openTab('Passengers')
			await ui.itinerary.passengers.getLine(1).then(async (_1st_passenger) => {
				await _1st_passenger.set('First Name', common.passengers().firstPassenger.firstName)
				await _1st_passenger.set('Last Name', common.passengers().firstPassenger.lastName)
				await _1st_passenger.set('Date of Birth', common.passengers().firstPassenger.dateOfBirth)
			})
			await ui.itinerary.passengers.saveChanges()
		})
		await test.step('confirm api services on bookings tab', async () => {
			await ui.itinerary.record.details.openTab('(Supplier) Bookings')
			await ui.itinerary.bookings.confirmManualServices()
			await ui.itinerary.bookings.confirmEmailServices()
			await ui.itinerary.bookings.confirmApiServices()
		})
		await test.step('convert to booking', async () => {
			await ui.itinerary.record.details.convertToBooking()
			await ui.itinerary.record.details.openTab('Details')
			await expect(
				await ui.itinerary.record.details.getBooking(),
				'Booking checkbox should be checked'
			).toBeChecked()
		})
		await test.step('take payment', async () => {
			await ui.itinerary.record.details.openTab('Payments')
			await ui.itinerary.payments.makePayment({
				payerName: common.personAccount.name(),
				paymentInfo: 'test payment - please ignore',
				payerEmail: common.accesibleEmail,
			})
		})
	})

	test('Test AMVA US - partial sit', { tag: ['@sp'] }, async ({ ui, actor }) => {
		await test.step('get TA account Id', async () => {
			common.TA.id = await actor.api
				.query(`SELECT Id FROM Account WHERE Name = 'Mr. Test PersonAccount'`)
				.then((result) => result.records[0] as Record)
				.then((record) => record.Id as SalesforceId)
		})
		await test.step('create TA contact', async () => {
			await actor.api.create('Contact', {
				LastName: common.personAccount.lastName,
				FirstName: common.personAccount.firstName,
				Phone: common.randomPhoneNumber(),
				Email: common.randomEmail(),
				AccountId: common.TA.id,
			})
		})
		await test.step('create trip', async () => {
			await ui.navigator.openTab('Trips')
			await ui.trip.tab.createNewRecord()
			await ui.trip.record.edit.selectChannel(common.trip.channelAVUS)
			await ui.trip.record.edit.selectAccount(common.TA.accountName)
			await ui.trip.record.edit.setTripName(common.trip.name)
			await ui.trip.record.edit.setGroupSize('1')
			await ui.trip.record.edit.setTravelStartDate('TODAY')
			await ui.trip.record.edit.setCurrencyIsoCode('USD')
			await ui.trip.record.edit.saveChanges()
		})
		await test.step('create itinerary using package search', async () => {
			await ui.trip.record.details.openPackageSearch()
			await ui.packageSearch.filters.setPackageName('USA and Canada Rail Experience Roundtrip from Chicago')
			await ui.packageSearch.filters.setDatesNextMonth(5)
			await ui.packageSearch.filters.setDefaultRooms(1)
			await ui.packageSearch.filters.setEnabledRoomOccupancy({ room: 1, adults: 1, children: 0 })
			await ui.packageSearch.filters.searchPackagesResults()
			await ui.packageSearch.results.resultsTab.selectRow(3).then(async (row) => {
				await row.addPackageToItinerary()
			})
			common.itineraryRecords.push(await ui.itinerary.record.details.getRecordId())
		})
		await test.step('add hotel', async () => {
			await ui.itinerary.record.details.openTab('Builder')
			await ui.itinerary.builder.addLine()
			await ui.itinerary.builder.getLine(1).then(async (line) => {
				await line.setService({ type: 'Accommodation', name: 'The Drake, Hilton Hotel' })
			})
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('change duration of stay', async () => {
			await ui.itinerary.builder.getLine(8).then(async (line) => {
				await line.changeAccomodationDates({ days: 1, impactSubsequentServices: true })
			})
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('change departure time and class of travel', async () => {
			const railSearch = await ui.itinerary.builder.getLine(14).then((line) => line.openRailSearch())
			await railSearch.setCalendarSliderDay('next')
			const _1st_journey = await railSearch.getJourney(2)
			await _1st_journey.expand()
			const _2nd_segment = await _1st_journey.getSegment(2)
			await _2nd_segment.expand()
			await _2nd_segment.setFare({ group: 'Sleepers', fare: 'Bedroom' })
			await railSearch.updateItinerary()
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('add promotion', async () => {
			const promotionLine = await ui.itinerary.builder.addLine('using + Add New service button')
			await promotionLine.setLocation('No Location')
			await promotionLine.setService({ type: 'Promotion', name: 'CA Package' })
			await ui.itinerary.builder.saveChanges()
		})
		await test.step('check passenger allocations', async () => {
			await ui.itinerary.record.details.openTab('Passengers')
			const passengerTab = await ui.itinerary.passengers.openPassengerAllocationTab()
			await expect(async () => {
				expect(
					await passengerTab.getAllocations(),
					'there should be at least 1 passenger allocation'
				).not.toHaveLength(0)
				expect(
					await passengerTab.getOverflowAllocations(),
					'there should be no overflow passenger allocations'
				).toHaveLength(0)
			}, 'passenger allocations should be correct').toPass({ timeout: 60_000 })
		})
		await test.step('send quote document', async () => {
			await ui.itinerary.record.details.openTab('Documents')
			await ui.itinerary.documents.openItineraryContentTab()
			const itineraryContent = await ui.itinerary.documents.startCreatingNewContent()
			await itineraryContent.selectTemplate('Quote AV TA with Commission')
			const customerPreview = await itineraryContent.saveChangesAndOpenPreview()
			const emailComposer = await customerPreview.sendAndPublish()
			await emailComposer.setTo()
			await emailComposer.send()
		})
		await test.step('add task', async () => {
			const taskEdit = await ui.itinerary.record.details.startAddingTask()
			await taskEdit.setSubject('Call')
			await taskEdit.setDueDate('TOMORROW', 'en-US')
			await taskEdit.save()
		})
		await test.step('add passenger details', async () => {
			await ui.itinerary.record.details.openTab('Passengers')
			await ui.itinerary.passengers.getLine(1).then(async (_1st_passenger) => {
				await _1st_passenger.set('First Name', common.passengers().firstPassenger.firstName)
				await _1st_passenger.set('Last Name', common.passengers().firstPassenger.lastName)
				await _1st_passenger.set('Date of Birth', common.passengers().firstPassenger.dateOfBirth)
			})
			await ui.itinerary.passengers.saveChanges()
		})
		await test.step('confirm api services on bookings tab', async () => {
			await ui.itinerary.record.details.openTab('(Supplier) Bookings')
			await ui.itinerary.bookings.confirmManualServices()
			await ui.itinerary.bookings.confirmEmailServices()
			await ui.itinerary.bookings.confirmApiServices()
		})
		await test.step('convert to booking', async () => {
			await ui.itinerary.record.details.convertToBooking()
			await ui.itinerary.record.details.openTab('Details')
			await expect(
				await ui.itinerary.record.details.getBooking(),
				'Booking checkbox should be checked'
			).toBeChecked()
		})
		await test.step('take payment', async () => {
			await ui.itinerary.record.details.openTab('Payments')
			await ui.itinerary.payments.makePayment({
				payerName: common.personAccount.name(),
				paymentInfo: 'test payment - please ignore',
				payerEmail: common.accesibleEmail,
			})
		})
	})
})
