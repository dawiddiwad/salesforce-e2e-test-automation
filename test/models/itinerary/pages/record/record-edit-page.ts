import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { faker } from '@faker-js/faker'
import { GeneralNamingPolicy } from '../../../../policies/general'
import { Channel } from '../../types/itinerary'
import { step } from '../../../../runners/custom-test-runner'

export class ItineraryRecordEditPage extends SalesforcePage {
	private readonly frames = {
		formNewRecord: this.page.getByTitle('accessibility').contentFrame(),
		lookup: (page: Page) => {
			return {
				searchResults: page.getByTitle('Results').contentFrame(),
				searchInput: page.getByTitle('Search').contentFrame(),
			}
		},
	}

	private readonly formNewRecord = {
		input: {
			itineraryName: this.frames.formNewRecord.getByLabel('Itinerary Name'),
			account: this.frames.formNewRecord.getByLabel('Account'),
			primaryContact: this.frames.formNewRecord.getByLabel('Primary Contact'),
			selectChannels: this.frames.formNewRecord.locator("//select[contains(@name,'channels')]"),
			groupSize: this.frames.formNewRecord
				.locator("//input[contains(@name,'groupSizeInput') and @type='text']")
				.or(this.frames.formNewRecord.getByRole('textbox', { name: 'Group Size' })),
			startDate: this.frames.formNewRecord.getByLabel('Travel Start Date'),
			endDate: this.frames.formNewRecord.getByLabel('Travel End Date'),
		},
		button: {
			save: this.frames.formNewRecord.locator('.pbBottomButtons').locator('#saveBtn'),
			lookupAccount: this.frames.formNewRecord.getByRole('link', { name: 'Account Lookup (New Window)' }),
			lookupContact: this.frames.formNewRecord.getByRole('link', { name: 'Primary Contact Lookup (New Window)' }),
		},
		alert: this.frames.formNewRecord.locator(this.toast.alert()),
	}

	private readonly lookup = (page: Page) => {
		return {
			linkSearchResults: (name: string) =>
				this.frames.lookup(page).searchResults.getByRole('link', { name: name, exact: true }),
			inputSearch: this.frames.lookup(page).searchInput.getByPlaceholder('Search...'),
			buttonGo: this.frames.lookup(page).searchInput.getByRole('button', { name: 'Go!' }),
		}
	}

	@step
	async fillName(name: string = GeneralNamingPolicy.uniqueBuzz()) {
		await this.formNewRecord.input.itineraryName.fill(name)
		await expect(this.formNewRecord.input.itineraryName, 'Name is populated').toHaveValue(name)
	}

	@step
	async selectChannel(option: Channel = 'Tours Europe') {
		await this.formNewRecord.input.selectChannels.selectOption({ label: option })
		await expect(this.formNewRecord.input.selectChannels, 'Channel is selected').not.toHaveValue('')
	}

	@step
	async fillGroupSize(size: number = 2) {
		await this.formNewRecord.input.groupSize.fill(size.toString())
		await expect(this.formNewRecord.input.groupSize, 'Group Size is populated').toHaveValue(size.toString())
	}

	@step
	async fillAccount(name: string) {
		await this.formNewRecord.input.account.fill(name)
		await expect(this.formNewRecord.input.account, 'Account is populated').toHaveValue(name)
	}

	@step
	async fillContact(name: string) {
		await this.formNewRecord.input.primaryContact.fill(name)
		await expect(this.formNewRecord.input.primaryContact, 'Contact is populated').toHaveValue(name)
	}

	@step
	async saveChanges() {
		try {
			await this.formNewRecord.button.save.click()
			await expect(this.page, 'changes are saved with no errors').not.toHaveURL(/new/)
			await expect(this.page, 'page is redirected to record view').toHaveURL(/view/)
		} catch (error) {
			const matcherResult = (error as { matcherResult?: { log: string[] } }).matcherResult
			throw new Error(
				`saving new Itinerary record due to\n${await this.getToastAlerts(this.formNewRecord.alert)}\n${matcherResult ? matcherResult.log.join('\n') : error}`
			)
		}
	}

	@step
	async fillAccountLookup(name: string) {
		const accountLookup = this.page.waitForEvent('popup')
		await this.formNewRecord.button.lookupAccount.click({ position: { x: 0, y: 0 } })
		await this.lookup(await accountLookup).inputSearch.clear()
		await this.lookup(await accountLookup).inputSearch.fill(name)
		await this.lookup(await accountLookup).buttonGo.click()
		await this.lookup(await accountLookup)
			.linkSearchResults(name)
			.click()
		await expect(this.formNewRecord.input.account, 'Account is populated').toHaveValue(name)
	}

	@step
	async fillContactLookup(name: string) {
		const contactLookup = this.page.waitForEvent('popup')
		await this.formNewRecord.button.lookupContact.click({ position: { x: 0, y: 0 } })
		await this.lookup(await contactLookup).inputSearch.clear()
		await this.lookup(await contactLookup).inputSearch.fill(name)
		await this.lookup(await contactLookup).buttonGo.click()
		await this.lookup(await contactLookup)
			.linkSearchResults(name)
			.click()
		await expect(this.formNewRecord.input.primaryContact, 'Contact is populated').toHaveValue(name)
	}

	@step
	async fillDates(
		start: Date = faker.date.soon({ days: 14 }),
		end: Date = faker.date.soon({ days: 7, refDate: start })
	) {
		await this.formNewRecord.input.startDate.fill(Intl.DateTimeFormat('en-GB').format(start))
		await expect(this.formNewRecord.input.startDate, 'Start Date is populated').not.toHaveValue('')
		await this.formNewRecord.input.endDate.clear()
		await this.formNewRecord.input.endDate.fill(Intl.DateTimeFormat('en-GB').format(end))
		await expect(this.formNewRecord.input.endDate, 'Start Date is populated').not.toHaveValue('')
	}
}
