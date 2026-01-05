import { expect } from '@playwright/test'
import { test } from '../../runners/custom-test-runner'
import { shared } from './support/test-data'

test.describe.parallel('email payments', async () => {
	test.beforeEach('preconditions', async ({ ui, api }) => {
		await test.step('setup email courier', async () => {
			await api.user.enablePermissionSet('Email Courier')
			await api.credential.external.setupEmailCourier()
		})

		await test.step('setup channel', async () => {
			expect(
				await api.channel.record.getByName(shared.channel),
				`single ${shared.channel} channel record should exist`
			).toHaveLength(1)
		})

		await test.step('reset shared email address', async () => {
			shared.email.reset()
		})

		await test.step('open qa app', async () => {
			await ui.navigator.openApp('QA')
		})

		await test.step('open itinerary tab and start creating a new quote record', async () => {
			await ui.navigator.openTab('Itineraries')
			await ui.itinerary.tab.startCreatingNewRecord('Quote')
		})

		await test.step('fill mandatory fields and save', async () => {
			await ui.itinerary.record.edit.fillAccountLookup(shared.account)
			await ui.itinerary.record.edit.fillContactLookup(shared.contact)
			await ui.itinerary.record.edit.fillName()
			await ui.itinerary.record.edit.fillDates()
			await ui.itinerary.record.edit.fillGroupSize(1)
			await ui.itinerary.record.edit.selectChannel(shared.channel)
			await ui.itinerary.record.edit.saveChanges()
		})

		await test.step('open builder tab and set primary locations', async () => {
			await ui.itinerary.record.details.openTab('Builder')
			await ui.itinerary.builder.setPrimaryLocations(['Europe'])
		})

		await test.step('add accommodation service line', async () => {
			await ui.itinerary.builder
				.addLine()
				.then((line) => line.setService({ type: 'Accommodation', name: 'Four Season Luxury' }))
		})

		await test.step('save line', async () => {
			await ui.itinerary.builder.saveChanges()
		})
	})

	test('payment confirmation', async ({ ui, email }) => {
		await test.step('open payments tab and fill manual amount', async () => {
			await ui.itinerary.record.details.openTab('Payments')
			await ui.itinerary.record.payment.fillManualAmount(0.1)
		})

		await test.step('select payment method and make payment', async () => {
			await ui.itinerary.record.payment.selectPaymentMethod('BANK TRANSFER (MANUAL PAYMENT)')
			await ui.itinerary.record.payment.makePayment()
			await ui.itinerary.record.payment.fillPaymentInformation({
				payerName: 'QA Sandbox',
				payerInfo: 'QA Sandbox',
				payerEmail: shared.email.address,
			})
		})

		await test.step('check email delivery', async () => {
			await expect
				.poll(() => email.gmail.findByRecipient(shared.email.address), {
					message: 'single payment confirmation email should be delivered',
					timeout: 2 * 60_000,
				})
				.toHaveLength(1)
		})
	})
})
