import { expect } from '@playwright/test'
import { fake } from './support/test-data'
import { test } from '../../runners/custom-test-runner'
import { BookingStatus, RecordType } from '../../models/itinerary/types/itinerary'

const shared = fake.packageSearchRecords()

test.beforeEach(async ({ actor, ui, api }) => {
	await test.step('open qa app', async () => {
		await ui.navigator.openApp('QA')
	})

	await test.step('set payment schedule in api registry', async () => {
		await api.apiRegistry.setDefaultPaymentSchedules()
	})

	await test.step('set contact <-> passenger flows in app settings', async () => {
		await api.appSettings.setContactToPassengerFlow(shared.flowAssignments.ContactToPassenger)
		await api.appSettings.setPassengerToContactFlow(shared.flowAssignments.PassengerToContact)
	})

	await test.step('set pilot features in user overrides', async () => {
		await api.userOverrides.setPilotFeatures(shared.pilotFeatures)
	})

	await test.step('use pilot features permission set', async () => {
		await api.user.enablePermissionSet(shared.permissionSets.pilotFeatures)
	})

	await test.step('enable advanced price summary for cabin', async () => {
		await api.priceCategoryType.enableAdvancedPriceSummaryForCabin()
	})

	await test.step('create passengers', async () => {
		shared.account = await api.account.record.createNewHousehold({
			Name: shared.accountName,
			PackageNamespace__EnablePassengerPaymentsPicklist__c: 'ChannelDependent',
			PackageNamespace__Primary_Channel__c: 'STD0',
		})
		shared.primaryPassenger = await actor.api.create('Contact', {
			LastName: shared.passengerName(1),
			AccountId: shared.account.id,
		})
		shared.secondPassenger = await actor.api.create('Contact', {
			LastName: shared.passengerName(2),
			AccountId: shared.account.id,
		})
		shared.thirdPassenger = await actor.api.create('Contact', {
			LastName: shared.passengerName(3),
			AccountId: shared.account.id,
		})
		shared.fourthPassenger = await actor.api.create('Contact', {
			LastName: shared.passengerName(4),
			AccountId: shared.account.id,
		})
	})
})

test.describe.serial('Package Search - POA Cruise', async () => {
	test('Booking Wizard basic flow', { tag: ['@TA-12193'] }, async ({ ui }) => {
		await test.step(`
        ---
        open package search via shared contact record
        search package using filters:
        - package name
        - dates
        - 4 double rooms
        ---
        `, async () => {
			const searchForPackages = async () => {
				try {
					await ui.navigator.goto(shared.primaryPassenger)
					await ui.contact.record.details.openPackageSearch()
					await ui.packageSearch.filters.setPackageName(
						'POA-2024-26-CRUISE-USD: Portrait of Arabia: The Emirates, Qatar & Oman'
					)
					await ui.packageSearch.filters.setDatesNextMonth()
					await ui.packageSearch.filters.setDefaultRooms(4)
					await ui.packageSearch.filters.searchPackagesAvailability()
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : ''
					if (errorMessage.includes('retry your recent action')) return errorMessage
					else throw error
				}
			}

			await expect
				.poll(
					async () => {
						await searchForPackages()
					},
					{ timeout: 3 * 60000, message: 'package search should be completed' }
				)
				.toBeTruthy()
		})

		await test.step(`
        ---
        process selected package:
        - select available date
        - open extended view
        - proceed to the booking wizard
        ---
        `, async () => {
			await ui.packageSearch.results.availabilityTab.selectRow(1).then(async (row) => {
				await row.selectFirstAvailableDay()
				await row.proceedToBookingWizard()
			})
		})

		await test.step(`
        ---
        on passengers tab:
        - set rooms for passengers
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.passengersTab.open().then(async (tab) => {
				await tab.forPassenger(1).setRoom(1)
				await tab.forPassenger(2).setRoom(2)
				await tab.forPassenger(3).setRoom(3)
			})
		})

		await test.step(`
        ---
        on select cabin tab:
        - auto assign cabins
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.selectCabinTab.open().then(async (tab) => {
				await tab.autoSelectCabins()
			})
		})

		await test.step(`
        ---
        on options tab:
        - set option for each room on each day
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.optionsTab.open().then(async (tab) => {
				await tab.selectDay(1).then(async (_1st_day) => {
					await _1st_day.forRoom(1).setOption('POA-2024-26-INS: Cancel Fee Waiver Plan')
					await _1st_day.forRoom(1).setOption('Dubai Activity - Dubai Activity - Adult')
					await _1st_day.forRoom(1).setOption('Dubai Hotel - Dubai Hotel - Double Room')
					await _1st_day.forRoom(2).setOption('POA-2024-26-INS: Cruise Protection Plan')
					await _1st_day.forRoom(2).setOption('Dubai Activity - Dubai Activity - Child')
					await _1st_day.forRoom(2).setOption('Dubai Hotel - Dubai Hotel - Double Room')
					await _1st_day.forRoom(3).setOption('POA-2024-26-INS: No Protection')
					await _1st_day.forRoom(3).setOption('Exciting Dubai Activity - Adult')
					await _1st_day.forRoom(3).setOption('Dubai Hotel - Dubai Hotel - Triple Room')
					await _1st_day.forRoom(4).setOption('POA-2024-26-INS: Cancel Fee Waiver Plan')
					await _1st_day.forRoom(4).setOption('Exciting Dubai Activity - Child')
					await _1st_day.forRoom(4).setOption('Best Dubai Hotel')
				})
				await tab.selectDay(2).then(async (_2nd_day) => {
					await _2nd_day.forRoom(1).setOption('Dubai Activity - Dubai Activity - Adult')
					await _2nd_day.forRoom(2).setOption('Dubai Activity - Dubai Activity - Child')
					await _2nd_day.forRoom(3).setOption('Exciting Dubai Activity - Adult')
					await _2nd_day.forRoom(4).setOption('Exciting Dubai Activity - Child')
				})
				await tab.selectDay(3).then(async (_3rd_day) => {
					await _3rd_day.forRoom(1).setOption('Abu Dhabi Activity - Abu Dhabi Activity - Adult')
					await _3rd_day.forRoom(1).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Double Room')
					await _3rd_day.forRoom(2).setOption('Abu Dhabi Activity - Abu Dhabi Activity - Child')
					await _3rd_day.forRoom(2).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Double Room')
					await _3rd_day.forRoom(3).setOption('Exciting Abu Dhabi Activity - Adult')
					await _3rd_day.forRoom(3).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Triple Room')
					await _3rd_day.forRoom(4).setOption('Exciting Abu Dhabi Activity - Child')
					await _3rd_day.forRoom(4).setOption('Best Abu Dhabi Hotel')
				})
				await tab.selectDay(4).then(async (_4th_day) => {
					await _4th_day.forRoom(1).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Double Room')
					await _4th_day.forRoom(2).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Double Room')
					await _4th_day.forRoom(3).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Triple Room')
					await _4th_day.forRoom(4).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Triple Room')
				})
				await tab.selectDay(5).then(async (_5th_day) => {
					await _5th_day.forRoom(1).setOption('Exciting Abu Dhabi Activity - Adult')
					await _5th_day.forRoom(2).setOption('Exciting Abu Dhabi Activity - Child')
					await _5th_day.forRoom(3).setOption('Exciting Abu Dhabi Activity - Adult')
					await _5th_day.forRoom(4).setOption('Exciting Abu Dhabi Activity - Child')
				})
				await tab.selectDay(6).then(async (_6th_day) => {
					await _6th_day.forRoom(1).setOption('Exciting Doha Activity - Adult')
					await _6th_day.forRoom(1).setOption('Doha Royal Hotel - Doha Royal Hotel - Double Room')
					await _6th_day.forRoom(2).setOption('Exciting Doha Activity - Child')
					await _6th_day.forRoom(2).setOption('Doha Royal Hotel - Doha Royal Hotel - Double Room')
					await _6th_day.forRoom(3).setOption('Doha Activity - Doha Activity - Adult')
					await _6th_day.forRoom(3).setOption('Doha Hotel - Doha Hotel - Double Room')
					await _6th_day.forRoom(4).setOption('Doha Activity - Doha Activity - Child')
					await _6th_day.forRoom(4).setOption('Doha Hotel - Doha Hotel - Double Room')
				})
				await tab.selectDay(7).then(async (_7th_day) => {
					await _7th_day.forRoom(1).setOption('Doha Activity - Doha Activity - Adult')
					await _7th_day.forRoom(1).setOption('Escorted Tour Service - Doha - Adult')
					await _7th_day.forRoom(2).setOption('Doha Activity - Doha Activity - Child')
					await _7th_day.forRoom(2).setOption('Escorted Tour Service - Doha - Child')
					await _7th_day.forRoom(3).setOption('Doha Activity - Doha Activity - Adult')
					await _7th_day.forRoom(3).setOption('Escorted Tour Service - Doha - Adult')
					await _7th_day.forRoom(4).setOption('Doha Activity - Doha Activity - Child')
					await _7th_day.forRoom(4).setOption('Escorted Tour Service - Doha - Child')
				})
				await tab.selectDay(8).then(async (_8th_day) => {
					await _8th_day.forRoom(1).setOption('Doha Golf')
					await _8th_day.forRoom(1).setOption('Exciting Doha Activity - Adult')
					await _8th_day.forRoom(2).setOption('Doha Golf')
					await _8th_day.forRoom(2).setOption('Exciting Doha Activity - Child')
					await _8th_day.forRoom(3).setOption('Doha Golf')
					await _8th_day.forRoom(3).setOption('Exciting Doha Activity - Adult')
					await _8th_day.forRoom(4).setOption('Doha Golf')
					await _8th_day.forRoom(4).setOption('Exciting Doha Activity - Child')
				})
				await tab.selectDay(9).then(async (_9th_day) => {
					await _9th_day.forRoom(1).setOption('Escorted Tour Service - Doha - Adult')
					await _9th_day.forRoom(2).setOption('Escorted Tour Service - Doha - Child')
					await _9th_day.forRoom(3).setOption('Escorted Tour Service - Doha - Adult')
					await _9th_day.forRoom(4).setOption('Escorted Tour Service - Doha - Child')
				})
				await tab.selectDay(10).then(async (_10th_day) => {
					await _10th_day.forRoom(1).setOption('Doha Activity - Doha Activity - Adult')
					await _10th_day.forRoom(2).setOption('Doha Activity - Doha Activity - Child')
					await _10th_day.forRoom(3).setOption('Exciting Doha Activity - Adult')
					await _10th_day.forRoom(4).setOption('Exciting Doha Activity - Child')
				})
				await tab.selectDay(11).then(async (_11th_day) => {
					await _11th_day.forRoom(1).setOption('Exciting Dubai Activity - Adult')
					await _11th_day.forRoom(2).setOption('Exciting Dubai Activity - Child')
					await _11th_day.forRoom(3).setOption('Dubai Activity - Dubai Activity - Adult')
					await _11th_day.forRoom(4).setOption('Dubai Activity - Dubai Activity - Child')
				})
			})
		})

		await test.step(`
        ---
        on pre stay tab:
        - set at least 4 nights for each room
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.preStayTab.open().then(async (tab) => {
				await tab.forRoom(1).andHotel('Dubai Hotel - Dubai Hotel - Double Room').setNights(4)
				await tab.forRoom(2).andHotel('Dubai Hotel - Dubai Hotel - Double Room').setNights(4)
				await tab.forRoom(3).andHotel('Dubai Hotel - Dubai Hotel - Triple Room').setNights(4)
				await tab.forRoom(4).andHotel('Best Abu Dhabi Hotel - Kingfisher Standard King/Twin Room').setNights(4)
			})
		})

		await test.step(`
        ---
        on post stay tab:
        - set at least 4 nights for each room
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.postStayTab.open().then(async (tab) => {
				await tab.forRoom(1).andHotel('Excellent Dubai Hotel - Double Room').setNights(4)
				await tab.forRoom(2).andHotel('Excellent Dubai Hotel - Double Room').setNights(4)
				await tab.forRoom(3).andHotel('Excellent Dubai Hotel - Triple Room').setNights(4)
				await tab.forRoom(4).andHotel('Best Dubai Hotel - Kingfisher Standard King/Twin Room').setNights(4)
			})
		})

		await test.step(`
        ---
        create a new itineary from booking wizard and verify:
        - itinerary was created with no issues
        - booking status is unconfirmed
        - record type is quote
        - name on booking is primary passenger's name
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.postStayTab.open().then(async (tab) => {
				await tab.createItinerary()
			})
			shared.itineraryId = await ui.itinerary.record.details.getRecordId()

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
					.toEqual(shared.passengerName(1)),
			]

			await expect(
				async () => await Promise.all([...tabVisibilityChecks, ...fieldValueChecks]),
				'itinerary should have correct data'
			).toPass({ timeout: 2 * 60000 })
		})
	})

	test('Change Occupancy flow', { tag: ['@TA-12400'] }, async ({ ui }) => {
		await test.step(`
            ---
            open itinerary record created via booking wizard:
            - on builder tab open occupancy change modal for any line
            - set cancellation on room 2
            - set occupancy change on room 3
            - confirm occupancy change
            ---
            `, async () => {
			await ui.navigator.goto(shared.itineraryId)
			await ui.itinerary.record.details.openTab('Builder')
			await ui.itinerary.builder.setPrimaryLocations(['Europe'])
			const builderLine = await ui.itinerary.builder.getLine(1)
			const builderLineOccupancy = await builderLine.openOccupancyChangeModal()
			await builderLineOccupancy.forRoom(2).setCancellation()
			await builderLineOccupancy.forRoom(3).setOccupancyChange()
			await builderLineOccupancy.changeOccupancy()
		})

		await test.step(`
            ---
            on package search:
            - change double room into a single room
            - check availability
            - proceed to the booking wizard via avialable slot
            ---
            `, async () => {
			await ui.packageSearch.filters.setOccupancy({ room: 1, adults: 1, children: 0 })
			await ui.packageSearch.filters.checkAvailability()
			await ui.packageSearch.results.availabilityTab.selectRow(1).then(async (row) => {
				await row.proceedToBookingWizard()
			})
		})

		await test.step(`
            ---
            on booking wizard select cabin tab:
            - confirm cancel passengers modal
            - auto select cabins
            - add changes to the itineary and skip optional addons
            ---
            `, async () => {
			await ui.packageSearch.bookingWizzard.selectCabinTab.open().then(async (tab) => {
				await tab.confirmPassengerCancellations()
				await tab.autoSelectCabins()
				await tab.addChangesToItineraryAndSkipOptionalAddons()
			})
		})
	})
})

test.describe.serial('Package Search - POA Land', async () => {
	test('Booking Wizard basic flow', { tag: ['@TA-12435'] }, async ({ ui }) => {
		await test.step(`
        ---
        open package search via shared contact record
        search package using filters:
        - package name
        - dates
        - 4 double rooms
        ---
        `, async () => {
			const searchForPackages = async () => {
				try {
					await ui.navigator.goto(shared.primaryPassenger)
					await ui.contact.record.details.openPackageSearch()
					await ui.packageSearch.filters.setPackageName(
						'POA-2024-26-LAND-USD: Portrait of Arabia: The Emirates, Qatar & Oman'
					)
					await ui.packageSearch.filters.setDatesNextMonth()
					await ui.packageSearch.filters.setDefaultRooms(4)
					await ui.packageSearch.filters.searchPackagesAvailability()
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : ''
					if (errorMessage.includes('retry your recent action')) return errorMessage
					else throw error
				}
			}

			await expect
				.poll(
					async () => {
						await searchForPackages()
					},
					{ timeout: 3 * 60000, message: 'package search should be completed' }
				)
				.toBeTruthy()
		})

		await test.step(`
        ---
        process selected package:
        - select available date
        - open extended view
        - proceed to the booking wizard
        ---
        `, async () => {
			await ui.packageSearch.results.availabilityTab.selectRow(1).then(async (row) => {
				await row.selectFirstAvailableDay()
				await row.proceedToBookingWizard()
			})
		})

		await test.step(`
        ---
        on passengers tab:
        - set rooms for passengers
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.passengersTab.open().then(async (tab) => {
				await tab.forPassenger(1).setRoom(1)
				await tab.forPassenger(2).setRoom(2)
				await tab.forPassenger(3).setRoom(3)
			})
		})

		await test.step(`
        ---
        on options tab:
        - set option for each room on each day
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.optionsTab.open().then(async (tab) => {
				await tab.selectDay(1).then(async (_1st_day) => {
					await _1st_day.forRoom(1).setOption('POA-2024-26-INS: Cruise Protection Plan')
					await _1st_day.forRoom(1).setOption('Dubai Activity - Dubai Activity - Adult')
					await _1st_day.forRoom(1).setOption('Dubai Hotel - Dubai Hotel - Double Room')
					await _1st_day.forRoom(2).setOption('POA-2024-26-INS: No Protection')
					await _1st_day.forRoom(2).setOption('Dubai Activity - Dubai Activity - Child')
					await _1st_day.forRoom(2).setOption('Dubai Hotel - Dubai Hotel - Triple Room')
					await _1st_day.forRoom(3).setOption('POA-2024-26-INS: Cancel Fee Waiver Plan')
					await _1st_day.forRoom(3).setOption('Exciting Dubai Activity - Adult')
					await _1st_day.forRoom(3).setOption('Dubai Hotel - Dubai Hotel - Double Room')
					await _1st_day.forRoom(4).setOption('POA-2024-26-INS: Cruise Protection Plan')
					await _1st_day.forRoom(4).setOption('Exciting Dubai Activity - Child')
					await _1st_day.forRoom(4).setOption('Dubai Hotel - Dubai Hotel - Double Room')
				})
				await tab.selectDay(2).then(async (_2nd_day) => {
					await _2nd_day.forRoom(1).setOption('Exciting Dubai Activity - Adult')
					await _2nd_day.forRoom(2).setOption('Exciting Dubai Activity - Child')
					await _2nd_day.forRoom(3).setOption('Dubai Activity - Dubai Activity - Adult')
					await _2nd_day.forRoom(4).setOption('Dubai Activity - Dubai Activity - Child')
				})
				await tab.selectDay(3).then(async (_3rd_day) => {
					await _3rd_day.forRoom(1).setOption('Abu Dhabi Activity - Abu Dhabi Activity - Adult')
					await _3rd_day.forRoom(1).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Double Room')
					await _3rd_day.forRoom(2).setOption('Abu Dhabi Activity - Abu Dhabi Activity - Child')
					await _3rd_day.forRoom(2).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Triple Room')
					await _3rd_day.forRoom(3).setOption('Exciting Abu Dhabi Activity - Adult')
					await _3rd_day.forRoom(3).setOption('Excellent Abu Dhabi Hotel - Double Room')
					await _3rd_day.forRoom(4).setOption('Exciting Abu Dhabi Activity - Child')
					await _3rd_day.forRoom(4).setOption('Excellent Abu Dhabi Hotel - Triple Room')
				})
				await tab.selectDay(4).then(async (_4th_day) => {
					await _4th_day.forRoom(1).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Double Room')
					await _4th_day.forRoom(2).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Triple Room')
					await _4th_day.forRoom(3).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Double Room')
					await _4th_day.forRoom(4).setOption('Abu Dhabi Hotel - Abu Dhabi Hotel - Triple Room')
				})
				await tab.selectDay(5).then(async (_5th_day) => {
					await _5th_day.forRoom(1).setOption('Exciting Abu Dhabi Activity - Adult')
					await _5th_day.forRoom(2).setOption('Exciting Abu Dhabi Activity - Child')
					await _5th_day.forRoom(3).setOption('Exciting Abu Dhabi Activity - Adult')
					await _5th_day.forRoom(4).setOption('Exciting Abu Dhabi Activity - Child')
				})
				await tab.selectDay(6).then(async (_6th_day) => {
					await _6th_day.forRoom(1).setOption('Exciting Doha Activity - Adult')
					await _6th_day.forRoom(1).setOption('Doha Hotel - Doha Hotel - Double Room')
					await _6th_day.forRoom(2).setOption('Exciting Doha Activity - Child')
					await _6th_day.forRoom(2).setOption('Doha Hotel - Doha Hotel - Triple Room')
					await _6th_day.forRoom(3).setOption('Doha Activity - Doha Activity - Adult')
					await _6th_day.forRoom(3).setOption('Excellent Doha Hotel - Double Room')
					await _6th_day.forRoom(4).setOption('Doha Activity - Doha Activity - Child')
					await _6th_day.forRoom(4).setOption('Excellent Doha Hotel - Triple Room')
				})
				await tab.selectDay(7).then(async (_7th_day) => {
					await _7th_day.forRoom(1).setOption('Doha Activity - Doha Activity - Adult')
					await _7th_day.forRoom(1).setOption('Escorted Tour Service - Doha - Adult')
					await _7th_day.forRoom(2).setOption('Doha Activity - Doha Activity - Child')
					await _7th_day.forRoom(2).setOption('Escorted Tour Service - Doha - Child')
					await _7th_day.forRoom(3).setOption('Doha Activity - Doha Activity - Adult')
					await _7th_day.forRoom(3).setOption('Escorted Tour Service - Doha - Adult')
					await _7th_day.forRoom(4).setOption('Doha Activity - Doha Activity - Child')
					await _7th_day.forRoom(4).setOption('Escorted Tour Service - Doha - Child')
				})
				await tab.selectDay(8).then(async (_8th_day) => {
					await _8th_day.forRoom(1).setOption('Doha Golf')
					await _8th_day.forRoom(1).setOption('Exciting Doha Activity - Adult')
					await _8th_day.forRoom(2).setOption('Doha Golf')
					await _8th_day.forRoom(2).setOption('Exciting Doha Activity - Child')
					await _8th_day.forRoom(3).setOption('Doha Golf')
					await _8th_day.forRoom(3).setOption('Exciting Doha Activity - Adult')
					await _8th_day.forRoom(4).setOption('Doha Golf')
					await _8th_day.forRoom(4).setOption('Exciting Doha Activity - Child')
				})
				await tab.selectDay(9).then(async (_9th_day) => {
					await _9th_day.forRoom(1).setOption('Escorted Tour Service - Doha - Adult')
					await _9th_day.forRoom(2).setOption('Escorted Tour Service - Doha - Child')
					await _9th_day.forRoom(3).setOption('Escorted Tour Service - Doha - Adult')
					await _9th_day.forRoom(4).setOption('Escorted Tour Service - Doha - Child')
				})
				await tab.selectDay(10).then(async (_10th_day) => {
					await _10th_day.forRoom(1).setOption('Exciting Doha Activity - Adult')
					await _10th_day.forRoom(2).setOption('Exciting Doha Activity - Child')
					await _10th_day.forRoom(3).setOption('Doha Activity - Doha Activity - Adult')
					await _10th_day.forRoom(4).setOption('Doha Activity - Doha Activity - Child')
				})
				await tab.selectDay(11).then(async (_11th_day) => {
					await _11th_day.forRoom(1).setOption('Dubai Activity - Dubai Activity - Adult')
					await _11th_day.forRoom(2).setOption('Dubai Activity - Dubai Activity - Child')
					await _11th_day.forRoom(3).setOption('Exciting Dubai Activity - Adult')
					await _11th_day.forRoom(4).setOption('Exciting Dubai Activity - Child')
				})
			})
		})

		await test.step(`
        ---
        on pre stay tab:
        - set at least 4 nights for each room
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.preStayTab.open().then(async (tab) => {
				await tab.forRoom(1).andHotel('Dubai Hotel - Dubai Hotel - Double Room').setNights(4)
				await tab.forRoom(2).andHotel('Dubai Hotel - Dubai Hotel - Triple Room').setNights(4)
				await tab.forRoom(3).andHotel('Best Dubai Hotel - Kingfisher Standard King/Twin Room').setNights(4)
				await tab.forRoom(4).andHotel('Excellent Dubai Hotel - Double Room').setNights(4)
			})
		})

		await test.step(`
        ---
        on post stay tab:
        - set at least 4 nights for each room
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.postStayTab.open().then(async (tab) => {
				await tab.forRoom(1).andHotel('Dubai Hotel - Dubai Hotel - Double Room').setNights(4)
				await tab.forRoom(2).andHotel('Dubai Hotel - Dubai Hotel - Triple Room').setNights(4)
				await tab.forRoom(3).andHotel('Best Dubai Hotel - Kingfisher Standard King/Twin Room').setNights(4)
				await tab.forRoom(4).andHotel('Excellent Dubai Hotel - Double Room').setNights(4)
			})
		})

		await test.step(`
        ---
        create a new itineary from booking wizard and verify:
        - itinerary was created with no issues
        - booking status is unconfirmed
        - record type is quote
        - name on booking is primary passenger's name
        ---
        `, async () => {
			await ui.packageSearch.bookingWizzard.postStayTab.open().then(async (tab) => {
				await tab.createItinerary()
			})
			shared.itineraryId = await ui.itinerary.record.details.getRecordId()

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
					.toEqual(shared.passengerName(1)),
			]

			await expect(
				async () => await Promise.all([...tabVisibilityChecks, ...fieldValueChecks]),
				'itinerary should have correct data'
			).toPass({ timeout: 2 * 60000 })
		})
	})

	test('Change Occupancy flow', { tag: ['@TA-12436'] }, async ({ ui }) => {
		await test.step(`
            ---
            open itinerary record created via booking wizard:
            - on builder tab open occupancy change modal for any line
            - set cancellation on room 2
            - set occupancy change on room 3
            - confirm occupancy change
            ---
            `, async () => {
			await ui.navigator.goto(shared.itineraryId)
			await ui.itinerary.record.details.openTab('Builder')
			await ui.itinerary.builder.setPrimaryLocations(['Europe'])
			const builderLine = await ui.itinerary.builder.getLine(1)
			const builderLineOccupancy = await builderLine.openOccupancyChangeModal()
			await builderLineOccupancy.forRoom(2).setCancellation()
			await builderLineOccupancy.forRoom(3).setOccupancyChange()
			await builderLineOccupancy.changeOccupancy()
		})

		await test.step(`
            ---
            on package search:
            - change double room into a single room
            - check availability
            - proceed to the booking wizard via avialable slot
            ---
            `, async () => {
			await ui.packageSearch.filters.setOccupancy({ room: 1, adults: 1, children: 0 })
			await ui.packageSearch.filters.checkAvailability()
			await ui.packageSearch.results.availabilityTab.selectRow(1).then(async (row) => {
				await row.proceedToBookingWizard()
			})
		})

		await test.step(`
            ---
            on booking wizard passengers tab:
            - confirm cancel passengers modal
            - add changes to the itineary and skip optional addons
            ---
            `, async () => {
			await ui.packageSearch.bookingWizzard.passengersTab.open().then(async (tab) => {
				await tab.confirmPassengerCancellations()
				await tab.addChangesToItineraryAndSkipOptionalAddons()
			})
		})
	})
})
