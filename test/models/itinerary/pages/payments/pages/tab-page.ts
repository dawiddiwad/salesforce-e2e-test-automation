import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../../runners/custom-test-runner'

export class ItineraryPaymentsTabPage extends SalesforcePage {
	private readonly payments = {
		container: () => this.page.frameLocator('iframe[title="accessibility title"]'),
		buttonMakePayment: () => this.payments.container().getByRole('button', { name: 'Make Payment' }),
	}

	private readonly standardPaymentOptions = {
		tab: () => this.payments.container().getByRole('tab', { name: 'Standard Payment Options' }),
		checkboxPayNow: () => this.payments.container().getByRole('checkbox'),
		buttonPayNow: () => this.payments.container().getByRole('button', { name: 'Pay Now' }),
	}

	private readonly paymentInformation = {
		header: () => this.payments.container().getByRole('heading', { name: 'Payment Information' }),
		textbox: (index: number) => this.payments.container().getByRole('textbox').nth(index),
		payerName: () => this.paymentInformation.textbox(0),
		paymentInfo: () => this.paymentInformation.textbox(1),
		payerEmail: () => this.paymentInformation.textbox(2),
		checkboxSendReceiptToPayer: () => this.payments.container().getByRole('checkbox'),
		buttonSave: () => this.payments.container().getByRole('button', { name: 'Save' }),
	}

	@step
	async makePayment(using: { payerName: string; paymentInfo: string; payerEmail: string }) {
		await this.payments.buttonMakePayment().click()
		await this.standardPaymentOptions.tab().click()
		const payNowOptions = () => this.standardPaymentOptions.checkboxPayNow().all()
		for (const payNowOption of await payNowOptions()) {
			await payNowOption.check()
		}
		await this.standardPaymentOptions.buttonPayNow().click()
		await this.paymentInformation.payerName().fill(using.payerName)
		await this.paymentInformation.paymentInfo().fill(using.paymentInfo)
		await this.paymentInformation.payerEmail().fill(using.payerEmail)
		await this.paymentInformation.checkboxSendReceiptToPayer().check()
		await this.paymentInformation.buttonSave().click()
		await expect(
			this.paymentInformation.header(),
			'payment should be sent and payement information should be closed'
		).toBeHidden()
	}
}
