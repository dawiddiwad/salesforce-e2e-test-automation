import { Record } from 'jsforce'
import { fake } from './support/test-data'
import { expect } from '@playwright/test'
import { test } from '../../runners/custom-test-runner'

test.describe.parallel(
	'Lock Sell Price',
	{
		annotation: {
			type: 'story',
			description: 'https://example-company.atlassian.net/browse/TA-6758',
		},
	},
	async () => {
		const shared = fake.itineraryRecords()
		let getPriceLines: () => Promise<Record[]>

		test.beforeEach(async ({ api, ui }) => {
			getPriceLines = async () =>
				await api.itinerary.record.getPriceLines(await ui.itinerary.record.details.getRecordId())

			await test.step('open qa app > itineraries tab', async () => {
				await ui.navigator.openApp('QA')
				await ui.navigator.openTab('Itineraries')
			})
		})

		test(
			'Scenarios 1 and 2: Enabling and Disabling Lock Sell Price mode',
			{ tag: ['@TA-12166'] },
			async ({ ui }) => {
				await test.step(`
        ---
        Given that an itinerary exists with services and prices and has Lock Sell Price Mode = false
        When I open the Builder
        Then Lock Sell Price switch is off
        ---
        `, async () => {
					await ui.itinerary.tab.createNewRecord({
						type: 'Quote',
						account: shared.accountName,
						contact: shared.contactName,
						channel: 'Tour Sales - Exclusive',
					})
					await ui.itinerary.record.details.openTab('Builder')
					await ui.itinerary.builder.setPrimaryLocations(['Europe'])
					await ui.itinerary.builder
						.addLine()
						.then((line) => line.setService({ type: 'Accommodation', name: 'Four Season Luxury' }))
					await ui.itinerary.builder.saveChanges()
					expect(
						await ui.itinerary.builder.getLockSellPriceState(),
						'Lock Sell Price should be disabled on Builder tab'
					).toBeFalsy()
				})

				await test.step(`
        ---
        When I open the Costings
        Then Lock Sell Price switch is off
        ---
        `, async () => {
					await ui.itinerary.record.details.openTab('Costings')
					expect(
						await ui.itinerary.costings.getLockSellPriceState(),
						'Lock Sell Price should be disabled on Costings tab'
					).toBeFalsy()
				})

				await test.step(`
        ---
        When I open the Price Lines modal on Costings
        Then Lock Sell Price switch is off
        ---
        `, async () => {
					await ui.itinerary.costings.getCostingsLine(1).then((line) => line.editPriceColumn('Gross Price'))
					await ui.itinerary.costings.getPriceLine('Amount').then(async (line) => {
						expect(
							await line.getLockSellPriceState(),
							'Lock Sell Price should be disabled on Costings Price Lines modal'
						).toBeFalsy()
					})
				})

				await test.step(`
        ---
        When I enable Lock Sell Price mode from Costings Price Lines modal
        ---
        `, async () => {
					await ui.itinerary.costings.getPriceLine('Amount').then(async (line) => {
						await line.lockSellPrice()
						await line.saveAllChanges()
					})
				})

				await test.step(`
        ---
        Then Itinerary get Lock Sell Price Mode = true across Builder and Costings tabs
        ---
        `, async () => {
					expect(
						await ui.itinerary.costings.getLockSellPriceState(),
						'Lock Sell Price should be enabled on Costings tab'
					).toBeTruthy()
					await ui.itinerary.record.details.openTab('Builder')
					expect(
						await ui.itinerary.builder.getLockSellPriceState(),
						'Lock Sell Price should be enabled on Builder tab'
					).toBeTruthy()
				})

				await test.step(`
        ---
        When I disable Lock Sell Price mode from Builder
        ---
        `, async () => {
					await ui.itinerary.builder.unlockSellPrice()
				})

				await test.step(`
        ---
        Then Itinerary get Lock Sell Price Mode = false across Builder and Costings tabs
        ---
        `, async () => {
					expect(
						await ui.itinerary.builder.getLockSellPriceState(),
						'Lock Sell Price should be disabled on Builder tab'
					).toBeFalsy()
					await ui.itinerary.record.details.openTab('Costings')
					expect(
						await ui.itinerary.costings.getLockSellPriceState(),
						'Lock Sell Price should be disabled on Costings tab'
					).toBeFalsy()
					await ui.itinerary.costings.getCostingsLine(1).then((line) => line.editPriceColumn('Gross Price'))
					await ui.itinerary.costings.getPriceLine('Amount').then(async (line) => {
						expect(
							await line.getLockSellPriceState(),
							'Lock Sell Price should be disabled on Costings Price Lines modal'
						).toBeFalsy()
					})
				})
			}
		)

		test(
			'Scenario 3a [Exclusive tax] > Changing cost price with Lock Sell Price mode enabled',
			{ tag: ['@TA-12156'] },
			async ({ actor, ui }) => {
				const priceLinesBeforeCostMod: Record[] = []
				const priceLinesAferCostMod: Record[] = []
				const priceLinesAfterSavingCostMod: Record[] = []

				await test.step(`
        ---
        Given that an itinerary exists with service and that service has price lines:
        - cost
        - cost tax - not manual
        - cost discount - percentage 
        - cost promo - percentage 
        - supplier commission - not manual
        - sell price - not manual and not a fixed amount (calculated based on markup rules)
        - sell tax - not manual
        - sell discount - percentage
        - sell promo - percentage
        - reseller commission - not manual
        - reseller commission tax - not manual
        - reseller commission promo
        ---
        `, async () => {
					await ui.itinerary.tab.createNewRecord({
						type: 'Quote',
						account: shared.accountName,
						contact: shared.contactName,
						channel: 'Tour Sales - Exclusive',
					})
					await ui.itinerary.record.details.openTab('Builder')
					await ui.itinerary.builder.setPrimaryLocations(['Europe'])
					await ui.itinerary.builder
						.addLine()
						.then((line) => line.setService({ type: 'Accommodation', name: 'Four Season Luxury' }))
					await ui.itinerary.builder.saveChanges()

					const priceLines = await getPriceLines()
					const priceLinesChecks = [
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'COST'),
								'COST Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'COSTTAX'),
								'COSTTAX Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'SELL'),
								'SELL Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'SELLTAX'),
								'SELLTAX Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'SUPCOMMISSION'),
								'SUPCOMMISSION Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'RESCOMMISSION'),
								'RESCOMMISSION Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'RESCOMMISSIONTAX'),
								'RESCOMMISSIONTAX Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'COSTPROMO'),
								'COSTPROMO Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'SELLPROMO'),
								'SELLPROMO Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'RESCOMPROMO'),
								'RESCOMPROMO Price Line should be present'
							)
							.toBeDefined(),
					]
					expect(
						priceLines.length,
						`There should be ${priceLinesChecks.length} Price Lines on Itinerary`
					).toEqual(priceLinesChecks.length)
				})

				await test.step(`
        ---
        And itinerary has Lock Sell Price Mode = true
        ---
        `, async () => {
					await ui.itinerary.builder.lockSellPrice()
					priceLinesBeforeCostMod.push(...(await getPriceLines()))
				})

				await test.step(`
        ---
        And tax group and/or tax percentage has changed on a service
        And reseller commission group and/or commission percentage has changed on a service
        ---
        `, async () => {
					priceLinesBeforeCostMod
						.filter((line) =>
							['SELLTAX', 'RESCOMMISSION'].some((type) => type === line.PackageNamespace__EntryType__c)
						)
						.map(async (line) => {
							line.PackageNamespace__Value__c = 500
							await actor.api.update('PackageNamespace__ItineraryPriceLine__c', line)
						})
				})

				await test.step(`
        ---
        When I open the Price Lines modal on Costings for that service
        And I change the Cost
        ---
        `, async () => {
					await ui.itinerary.record.details.openTab('Costings')
					await ui.itinerary.costings.getCostingsLine(1).then((line) => line.editPriceColumn('Gross Price'))
					await ui.itinerary.costings
						.getPriceLine('Amount')
						.then((line) => line.setColumn('Supplier Cost', 500))
					priceLinesAferCostMod.push(...(await getPriceLines()))
				})

				await test.step(`
        ---
        Then the following values are not affected:
        - cost
        - cost tax
        - cost discount
        - cost promo
        - supplier commission
        ---
        `, async () => {
					const actual = priceLinesAferCostMod.filter((line) =>
						['COST', 'COSTTAX', 'COSTPROMO', 'SUPCOMMISSION'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['COST', 'COSTTAX', 'COSTPROMO', 'SUPCOMMISSION'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)

					expect(
						actual,
						'COST, COSTTAX, COSTPROMO, SUPCOMMISSION price lines should have changed'
					).toMatchObject(expected)
				})

				await test.step(`
        ---
        And the following values are not affected:
        - sell price
        - sell discount
        - sell promo
        - reseller commission
        - reseller commission promo
        ---
        `, async () => {
					const actual = priceLinesAferCostMod.filter((line) =>
						['SELL', 'SELLPROMO', 'RESCOMMISSION', 'RESCOMPROMO'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['SELL', 'SELLPROMO', 'RESCOMMISSION', 'RESCOMPROMO'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)

					expect(
						actual,
						'SELL, SELLPROMO, RESCOMMISSION, RESCOMPROMO price lines should not have changed'
					).toMatchObject(expected)
				})

				await test.step(`
        ---
        And the following values are not affected if Tax Handling = Exclusive:
        - sell tax
        - reseller commission tax
        ---
        `, async () => {
					const actual = priceLinesAferCostMod.filter((line) =>
						['SELLTAX', 'RESCOMMISSIONTAX'].some((type) => type === line.PackageNamespace__EntryType__c)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['SELLTAX', 'RESCOMMISSIONTAX'].some((type) => type === line.PackageNamespace__EntryType__c)
					)

					expect(actual, 'SELLTAX, RESCOMMISSIONTAX price lines should not have changed').toMatchObject(
						expected
					)
				})

				await test.step(`
        ---
        When I save the Price Lines modal
        ---
        `, async () => {
					await ui.itinerary.costings.getPriceLine('Amount').then((line) => line.saveAllChanges())
					priceLinesAfterSavingCostMod.push(...(await getPriceLines()))
				})

				await test.step(`
        ---
        Then the following price lines are not updated on the itinerary item:
        - SELL
        - SELLPROMO
        - SELLDISCOUNT
        - RESCOMMISSION
        - RESCOMPROMO
        ---
        `, async () => {
					const actual = priceLinesAfterSavingCostMod.filter((line) =>
						['SELL', 'SELLPROMO', 'RESCOMMISSION', 'RESCOMPROMO'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['SELL', 'SELLPROMO', 'RESCOMMISSION', 'RESCOMPROMO'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)

					expect(
						actual,
						'SELL, SELLPROMO, RESCOMMISSION, RESCOMPROMO price lines should have changed'
					).toMatchObject(expected)
				})

				await test.step(`
        ---
        And the following price lines are not updated if Tax Handling = Exclusive:
        - SELLTAX
        - RESCOMMISSIONTAX
        ---
        `, async () => {
					const actual = priceLinesAfterSavingCostMod.filter((line) =>
						['SELLTAX', 'RESCOMMISSIONTAX'].some((type) => type === line.PackageNamespace__EntryType__c)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['SELLTAX', 'RESCOMMISSIONTAX'].some((type) => type === line.PackageNamespace__EntryType__c)
					)

					expect(actual, 'SELLTAX, RESCOMMISSIONTAX price lines should not have changed').toMatchObject(
						expected
					)
				})

				await test.step(`
        ---
        And other price lines are updated according to the values that came from TA API and were shown in the Price Lines modal
        ---
        `, async () => {
					const actual = priceLinesAfterSavingCostMod.filter((line) =>
						['COST', 'COSTTAX', 'COSTPROMO', 'SUPCOMMISSION'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['COST', 'COSTTAX', 'COSTPROMO', 'SUPCOMMISSION'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)

					expect(
						actual,
						'COST, COSTTAX, COSTPROMO, SUPCOMMISSION price lines should have changed'
					).not.toMatchObject(expected)
				})
			}
		)

		test(
			'Scenario 3b [Inclusive tax] > Changing cost price with Lock Sell Price mode enabled',
			{ tag: ['@TA-12157'] },
			async ({ actor, ui }) => {
				const priceLinesBeforeCostMod: Record[] = []
				const priceLinesAferCostMod: Record[] = []
				const priceLinesAfterSavingCostMod: Record[] = []

				await test.step(`
        ---
        Given that an itinerary exists with service and that service has price lines:
        - cost
        - cost tax - not manual
        - cost discount - percentage 
        - cost promo - percentage 
        - supplier commission - not manual
        - sell price - not manual and not a fixed amount (calculated based on markup rules)
        - sell tax - not manual
        - sell discount - percentage
        - sell promo - percentage
        - reseller commission - not manual
        - reseller commission tax - not manual
        - reseller commission promo
        ---
        `, async () => {
					await ui.itinerary.tab.createNewRecord({
						type: 'Quote',
						account: shared.accountName,
						contact: shared.contactName,
						channel: 'Tour Sales - Inclusive',
					})
					await ui.itinerary.record.details.openTab('Builder')
					await ui.itinerary.builder.setPrimaryLocations(['Europe'])
					await ui.itinerary.builder
						.addLine()
						.then((line) => line.setService({ type: 'Accommodation', name: 'Four Season Luxury' }))
					await ui.itinerary.builder.saveChanges()

					const priceLines = await getPriceLines()
					const priceLinesChecks = [
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'COST'),
								'COST Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'COSTTAX'),
								'COSTTAX Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'SELL'),
								'SELL Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'SELLTAX'),
								'SELLTAX Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'SUPCOMMISSION'),
								'SUPCOMMISSION Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'RESCOMMISSION'),
								'RESCOMMISSION Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'RESCOMMISSIONTAX'),
								'RESCOMMISSIONTAX Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'COSTPROMO'),
								'COSTPROMO Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'SELLPROMO'),
								'SELLPROMO Price Line should be present'
							)
							.toBeDefined(),
						expect
							.soft(
								priceLines.find((line) => line.PackageNamespace__EntryType__c === 'RESCOMPROMO'),
								'RESCOMPROMO Price Line should be present'
							)
							.toBeDefined(),
					]
					expect(
						priceLines.length,
						`There should be ${priceLinesChecks.length} Price Lines on Itinerary`
					).toEqual(priceLinesChecks.length)
				})

				await test.step(`
        ---
        And itinerary has Lock Sell Price Mode = true
        ---
        `, async () => {
					await ui.itinerary.builder.lockSellPrice()
					priceLinesBeforeCostMod.push(...(await getPriceLines()))
				})

				await test.step(`
        ---
        And tax group and/or tax percentage has changed on a service
        And reseller commission group and/or commission percentage has changed on a service
        ---
        `, async () => {
					priceLinesBeforeCostMod
						.filter((line) =>
							['SELLTAX', 'RESCOMMISSION'].some((type) => type === line.PackageNamespace__EntryType__c)
						)
						.map(async (line) => {
							line.PackageNamespace__Value__c = 500
							await actor.api.update('PackageNamespace__ItineraryPriceLine__c', line)
						})
				})

				await test.step(`
        ---
        When I open the Price Lines modal on Costings for that service
        And I change the Cost
        ---
        `, async () => {
					await ui.itinerary.record.details.openTab('Costings')
					await ui.itinerary.costings.getCostingsLine(1).then((line) => line.editPriceColumn('Gross Price'))
					await ui.itinerary.costings
						.getPriceLine('Amount')
						.then((line) => line.setColumn('Supplier Cost', 500))
					priceLinesAferCostMod.push(...(await getPriceLines()))
				})

				await test.step(`
        ---
        Then the following values are not affected:
        - cost
        - cost tax
        - cost discount
        - cost promo
        - supplier commission
        ---
        `, async () => {
					const actual = priceLinesAferCostMod.filter((line) =>
						['COST', 'COSTTAX', 'COSTPROMO', 'SUPCOMMISSION'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['COST', 'COSTTAX', 'COSTPROMO', 'SUPCOMMISSION'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)

					expect(
						actual,
						'COST, COSTTAX, COSTPROMO, SUPCOMMISSION price lines should have changed'
					).toMatchObject(expected)
				})

				await test.step(`
        ---
        And the following values are not affected:
        - sell price
        - sell discount
        - sell promo
        - reseller commission
        - reseller commission promo
        ---
        `, async () => {
					const actual = priceLinesAferCostMod.filter((line) =>
						['SELL', 'SELLPROMO', 'RESCOMMISSION', 'RESCOMPROMO'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['SELL', 'SELLPROMO', 'RESCOMMISSION', 'RESCOMPROMO'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)

					expect(
						actual,
						'SELL, SELLPROMO, RESCOMMISSION, RESCOMPROMO price lines should not have changed'
					).toMatchObject(expected)
				})

				await test.step(`
        ---
        And the following values are not affected if Tax Handling = Inclusive:
        - sell tax
        - reseller commission tax
        ---
        `, async () => {
					const actual = priceLinesAferCostMod.filter((line) =>
						['SELLTAX', 'RESCOMMISSIONTAX'].some((type) => type === line.PackageNamespace__EntryType__c)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['SELLTAX', 'RESCOMMISSIONTAX'].some((type) => type === line.PackageNamespace__EntryType__c)
					)

					expect(actual, 'SELLTAX, RESCOMMISSIONTAX price lines should not have changed').toMatchObject(
						expected
					)
				})

				await test.step(`
        ---
        When I save the Price Lines modal
        ---
        `, async () => {
					await ui.itinerary.costings.getPriceLine('Amount').then((line) => line.saveAllChanges())
					priceLinesAfterSavingCostMod.push(...(await getPriceLines()))
				})

				await test.step(`
        ---
        Then the following price lines are not updated on the itinerary item:
        - SELL
        - SELLPROMO
        - SELLDISCOUNT
        - RESCOMMISSION
        - RESCOMPROMO
        ---
        `, async () => {
					const actual = priceLinesAfterSavingCostMod.filter((line) =>
						['SELL', 'SELLPROMO', 'RESCOMMISSION', 'RESCOMPROMO'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['SELL', 'SELLPROMO', 'RESCOMMISSION', 'RESCOMPROMO'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)

					expect(
						actual,
						'SELL, SELLPROMO, RESCOMMISSION, RESCOMPROMO price lines should have changed'
					).toMatchObject(expected)
				})

				await test.step(`
        ---
        And the following price lines are updated if Tax Handling = Inclusive:
        - SELLTAX
        - RESCOMMISSIONTAX
        ---
        `, async () => {
					const actual = priceLinesAfterSavingCostMod.filter((line) =>
						['SELLTAX', 'RESCOMMISSIONTAX'].some((type) => type === line.PackageNamespace__EntryType__c)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['SELLTAX', 'RESCOMMISSIONTAX'].some((type) => type === line.PackageNamespace__EntryType__c)
					)

					expect(actual, 'SELLTAX, RESCOMMISSIONTAX price lines should not have changed').not.toMatchObject(
						expected
					)
				})

				await test.step(`
        ---
        And other price lines are updated according to the values that came from TA API and were shown in the Price Lines modal
        ---
        `, async () => {
					const actual = priceLinesAfterSavingCostMod.filter((line) =>
						['COST', 'COSTTAX', 'COSTPROMO', 'SUPCOMMISSION'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)
					const expected = priceLinesBeforeCostMod.filter((line) =>
						['COST', 'COSTTAX', 'COSTPROMO', 'SUPCOMMISSION'].some(
							(type) => type === line.PackageNamespace__EntryType__c
						)
					)

					expect(
						actual,
						'COST, COSTTAX, COSTPROMO, SUPCOMMISSION price lines should have changed'
					).not.toMatchObject(expected)
				})
			}
		)

		test(
			'Scenario 12: Changing Price Category and Add-Ons on new lines in the Builder with Lock Sell Price Mode enabled',
			{ tag: '@TA-12282' },
			async ({ ui }) => {
				await test.step(`
        ---
        Given that Lock Sell Price mode is enabled for the itinerary
        ---
        `, async () => {
					await ui.itinerary.tab.createNewRecord({
						type: 'Quote',
						account: shared.accountName,
						contact: shared.contactName,
						channel: 'Tour Sales - Exclusive',
					})
					await ui.itinerary.record.details.openTab('Builder')
					await ui.itinerary.builder.setPrimaryLocations(['Europe'])
					await ui.itinerary.builder.lockSellPrice()
				})

				await test.step(`
        ---
        When I add a new service to the Builder 
        And I open the Price Category popover on that line
        Then I can change the Price Category and Meal Plan
        And the options in these dropdowns show 0 prices
        ---
        `, async () => {
					await ui.itinerary.builder.addLine().then(async (line) => {
						await line.setService({
							type: 'Accommodation',
							name: 'Hotel Cuatro Estaciones',
						})
					})
					await ui.itinerary.builder.getLine(1).then(async (line) => {
						await line.openPriceCategoriesPopover().then(async (popover) => {
							const available = await popover.getAvailablePriceCategories()

							expect(
								available.length,
								'there should be at least 2 Price Categories available'
							).toBeGreaterThanOrEqual(2)
							available.forEach((category) =>
								expect(
									category.price.amount,
									`Price Category ${category.name} should be priced 0`
								).toEqual(0)
							)

							await popover.close()
						})
					})
				})

				await test.step(`
        ---
        When I change Price Category or Meal Plan and apply changes
        Then the builder line still shows 0 value in the Sell Price column
        ---
        `, async () => {
					await ui.itinerary.builder.getLine(1).then(async (line) => {
						await line.setPriceCategory('Habitación gemela')
						expect(
							await line.getSellPrice().then((price) => price.amount),
							'Sell Price should be 0.00'
						).toEqual(0.0)
					})
				})

				await test.step(`
        ---
        When I open Add-ons popover on my builder line
        Then mandatory add-ons that were added automatically show 0 value in the Total Price column
        ---
        `, async () => {
					await ui.itinerary.builder.getLine(1).then(async (line) => {
						await line.setService({
							type: 'Accommodation',
							name: 'AB Test Hotel',
						})
						await line.openAddOnsPopover().then(async (popover) => {
							const selected = await popover.getSelectedAddOns()

							selected.forEach((addOn) =>
								expect(addOn.price.amount, `Add-On ${addOn.name} should be priced 0.00`).toEqual(0.0)
							)

							await popover.close()
						})
					})
				})

				await test.step(`
        ---
        When I expand the list of add-ons in the 'Select an Add-on' dropdown
        Then all add-ons there show 0 price
        ---
        `, async () => {
					await ui.itinerary.builder.getLine(1).then(async (line) => {
						await line.openAddOnsPopover().then(async (popover) => {
							const available = await popover.getAvailableAddOns()

							expect(
								available.length,
								'there should be at least 2 Add-Ons available'
							).toBeGreaterThanOrEqual(2)
							available.forEach((addOn) =>
								expect(addOn.price.amount, `Add-On ${addOn.name} should be priced 0`).toEqual(0)
							)

							await popover.close()
						})
					})
				})

				await test.step(`
        ---
        When I select one of them
        Then the new add-on shows 0 value in the Total Price column
        And I can remove any add-on
        ---
        `, async () => {
					await ui.itinerary.builder.getLine(1).then(async (line) => {
						await line.openAddOnsPopover().then(async (popover) => {
							await popover.selectAddOn('Day Add-on')
							await popover
								.getSelectedAddOns()
								.then((addOns) =>
									addOns.forEach((item) =>
										expect(item.price.amount, `Add-On ${item.name} should be priced 0.00`).toEqual(
											0.0
										)
									)
								)

							await popover.deleteAddOn('Mandatory Booking Add-on')
							await popover
								.getSelectedAddOns()
								.then((addOns) =>
									addOns.forEach((item) =>
										expect(item.price.amount, `Add-On ${item.name} should be priced 0.00`).toEqual(
											0.0
										)
									)
								)

							await popover.close()
						})
					})
				})

				await test.step(`
        ---
        When I apply changes
        Then the builder line still shows 0 value in the Sell Price column
        ---
        `, async () => {
					await ui.itinerary.builder.getLine(1).then(async (line) => {
						await line.openAddOnsPopover().then(async (popover) => {
							await popover.selectAddOn('Day Add-on')
							await popover.deleteAddOn('Mandatory Booking Add-on')
							await popover.applyChanges()
						})
						expect(
							await line.getSellPrice().then((price) => price.amount),
							'Sell Price should be 0.00'
						).toEqual(0.0)
					})
				})
			}
		)
	}
)
