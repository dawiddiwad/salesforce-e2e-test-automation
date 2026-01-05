import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'

export class TripRecordEditPage extends SalesforcePage {
	private readonly lookup = {
		input: (name: string) => this.page.locator('.slds-lookup').filter({ hasText: name }).locator('input'),
		value: (value: string) =>
			this.page
				.locator('.slds-pill__label')
				.filter({ hasText: value })
				.getByText(value)
				.describe(`${value} lookup value`),
		option: (option: string) =>
			this.page.getByRole('option', { name: option }).first().describe(`${option} lookup option`),
	}

	private readonly combobox = {
		language: this.page
			.locator('lightning-layout-item')
			.filter({ hasText: 'Language' })
			.getByRole('combobox')
			.describe('Language combobox'),
		currencyIsoCode: this.page
			.locator('lightning-layout-item')
			.filter({ hasText: 'Currency ISO Code' })
			.getByRole('combobox')
			.describe('Currency ISO Code combobox'),
	}

	private readonly textbox = {
		tripName: this.page.getByRole('textbox', { name: 'Trip Name' }).describe('Trip Name field'),
		groupSize: this.page.getByRole('spinbutton', { name: 'Group Size' }).describe('Group Size field'),
	}

	public readonly travelStartDate = {
		input: this.page.getByRole('textbox', { name: 'Travel Start Date' }).describe('Travel Start Date field'),
		datepicker: {
			today: this.page
				.getByRole('button', { name: 'Today' })
				.describe('Today button in the Travel Start Date picker'),
		},
	}

	private readonly button = {
		save: this.page.getByRole('button', { name: 'Save' }).describe('Save button'),
	}

	@step
	async saveChanges() {
		try {
			await this.button.save.click()
			await expect(this.page, 'changes are saved with no errors').not.toHaveURL(/new/)
			await expect(this.page, 'page is redirected to record view').toHaveURL(/view/)
		} catch (error) {
			throw new Error(`saving Trip record due to\n${await this.getToastAlerts()}\n${error}`)
		}
	}

	@step
	async selectChannel(channel: string) {
		await this.lookup.input('Channel').click()
		await this.lookup.input('Channel').pressSequentially(channel, { delay: 50 })
		await this.lookup.option(channel).click()
		await expect(this.lookup.value(channel), `Channel ${channel} should be set`).toBeVisible()
	}

	@step
	async selectAccount(account: string) {
		await this.lookup.input('Account').click()
		await this.lookup.input('Account').pressSequentially(account, { delay: 50 })
		await this.lookup.option(account).click()
		await expect(this.lookup.value(account), `Account ${account} should be set`).toBeVisible()
	}

	@step
	async setTripName(tripName: string) {
		await this.textbox.tripName.fill(tripName)
		await expect(this.textbox.tripName, `Trip Name ${tripName} should be set`).toHaveValue(tripName)
	}

	@step
	async setGroupSize(groupSize: string) {
		await this.textbox.groupSize.fill(groupSize)
		await expect(this.textbox.groupSize, `Group Size ${groupSize} should be set`).toHaveValue(groupSize)
	}

	@step
	async setTravelStartDate(travelStartDate: Date | 'TODAY') {
		await this.travelStartDate.input.click()
		if (travelStartDate === 'TODAY') await this.travelStartDate.datepicker.today.click()
		await expect(this.travelStartDate.input, `Travel Start Date ${travelStartDate} should be set`).not.toBeEmpty()
	}

	@step
	async setLanguage(language: string) {
		await this.combobox.language.selectOption(language)
	}

	@step
	async setCurrencyIsoCode(currencyIsoCode: string) {
		await this.combobox.currencyIsoCode.selectOption(currencyIsoCode)
	}
}
