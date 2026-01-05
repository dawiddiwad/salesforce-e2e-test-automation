import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { PaymentMethod } from './tab-payments'

export class ItineraryRecordPaymentPage extends SalesforcePage {
	private readonly fields = {
		manualAmount: this.page
			.getByRole('textbox', { name: 'Manual Amount' })
			.first()
			.describe('first available Manual Amount field on the Payments list'),
		payerName: this.page.getByRole('textbox', { name: '*Payer Name' }),
		payerInfo: this.page.getByRole('textbox', { name: '*Payment Info' }),
		payerEmail: this.page.getByRole('textbox', { name: 'Payer Email' }),
	}

	private readonly buttons = {
		combobox: this.page
			.locator('button[role="combobox"][name="paymentMethods"]')
			.describe('Payment Method combobox'),
		makePayment: this.page.getByRole('button', { name: /Make Payment/i }),
		save: this.page.getByRole('button', { name: 'Save' }),
	}

	private readonly paymentInfo = {
		listbox: this.page.locator('div[role="listbox"]').describe('Payment Method list'),
		heading: this.page.getByRole('heading', { name: 'Payment Information' }),
		checkbox: this.page.locator('c-lwc-layout span').nth(1).describe('Send receipt to Payer checkbox'),
	}

	@step
	async fillManualAmount(amount: number) {
		await this.fields.manualAmount.fill(amount.toString())
		await expect(this.fields.manualAmount, 'Manual Amount is populated').toHaveValue(amount.toString())
	}

	@step
	async selectPaymentMethod(methodName: PaymentMethod) {
		await this.buttons.combobox.click()
		await this.paymentInfo.listbox.waitFor({ state: 'visible' })
		const option = this.paymentInfo.listbox.locator(`span[title="${methodName}"]`)
		await option.waitFor({ state: 'visible' })
		await option.click({ force: true })
		await expect(this.buttons.combobox, `${methodName} payment method should be selected`).toHaveAttribute(
			'data-value',
			methodName
		)
	}

	@step
	async makePayment() {
		await expect(this.buttons.makePayment).toBeVisible()
		await this.buttons.makePayment.click()
		await expect(this.paymentInfo.heading, 'Payment Information should be visible').toBeVisible()
	}

	@step
	async fillPaymentInformation({
		payerName,
		payerInfo,
		payerEmail,
	}: {
		payerName: string
		payerInfo: string
		payerEmail: string
	}) {
		await this.fields.payerName.fill(payerName)
		await this.fields.payerInfo.fill(payerInfo)
		await this.fields.payerEmail.fill(payerEmail)
		await this.paymentInfo.checkbox.click()
		await this.buttons.save.click()
		await expect(this.paymentInfo.heading, 'Payment Information should be closed').toBeHidden()
	}
}
