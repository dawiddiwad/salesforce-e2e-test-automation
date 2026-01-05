import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../../src/models/pages/salesforce-page'
import { step } from '../../../../runners/custom-test-runner'
import { Location } from '../../types/tab-builder'
import { ItineraryBuilderLinePage } from './line/builder-line-page'

export class ItineraryBuilderTabPage extends SalesforcePage {
	private readonly headerTitle = this.page.locator('header .slds-card__header-title')

	private readonly table = {
		spinner: this.page.getByLabel('Builder').getByRole('status'),
		line: this.page.locator('c-lwc-itinerary-builder-line'),
	}

	private readonly actions = {
		button: {
			show: this.page.getByRole('button', { name: 'More actions', exact: true }),
			setPrimaryLocations: this.page.getByTitle('Set Primary Locations', { exact: true }),
		},
	}

	private readonly button = {
		addNewItem: this.page.getByRole('button', { name: 'Add new line', exact: true }),
		addNewService: this.page.getByRole('button', { name: '+ Add New service', exact: true }),
		legend: this.page.getByRole('button', { name: 'Info', exact: true }),
		save: this.page.getByRole('button', { name: 'Save', exact: true }),
		new: this.page.getByRole('button', { name: 'New', exact: true }),
	}

	private readonly checkbox = {
		lockSellPrice: this.page
			.locator('PackageNamespace-lwc-itinerary-builder')
			.locator("//label[.='Lock Sell Price']//span[@class='slds-checkbox_faux_container']"),
	}

	private readonly modal = {
		keyboardShortcutsTooltip: this.page.getByRole('tooltip').getByText('keyboard shortcuts'),
		primaryLocations: {
			input: {
				filterLocations: this.page.getByPlaceholder('Filter Locations...'),
			},
			item: {
				availableLocation: (title: Location) => this.page.getByTitle(title, { exact: true }),
			},
			button: {
				moveToPrimaryLocations: this.page.getByTitle('Move to Primary Locations', { exact: true }),
				moveToAllAvailableLocations: this.page.getByTitle('Move to All Available Locations', { exact: true }),
				save: this.page.getByRole('button').getByText('Save', { exact: true }),
				cancel: this.page.getByRole('button').getByText('Cancel', { exact: true }),
			},
		},
	}

	private async handleShortcutsTooltip() {
		await this.button.legend.click({ trial: true })
		if (await this.modal.keyboardShortcutsTooltip.isVisible()) {
			await this.button.legend.click()
		}
	}

	@step
	async getLockSellPriceState() {
		return this.checkbox.lockSellPrice.isChecked()
	}

	@step
	async unlockSellPrice() {
		if (!(await this.getLockSellPriceState())) return
		else return this.toggleLockSellPrice()
	}

	@step
	async lockSellPrice() {
		if (await this.getLockSellPriceState()) return
		else return this.toggleLockSellPrice()
	}

	@step
	async toggleLockSellPrice() {
		const initialState = await this.getLockSellPriceState()
		if (initialState) await this.checkbox.lockSellPrice.uncheck()
		else await this.checkbox.lockSellPrice.check()
		expect(this.checkbox.lockSellPrice.isChecked, 'Lock Sell Price checkbox was toggled').not.toBe(initialState)
	}

	@step
	async saveChanges() {
		try {
			await this.button.save.click()
			await this.waitForSpinners()
			await expect(this.button.save, 'Save button is no longer available').toBeHidden()
		} catch (error) {
			throw new Error(
				`saving Builder Lines due to\n${await this.getToastAlerts()}\n${error.matcherResult ? error.matcherResult.log.join('\n') : error}`
			)
		}
	}

	@step
	async setPrimaryLocations(locations: Location[]) {
		try {
			for (const name of locations) {
				await this.modal.primaryLocations.input.filterLocations.fill(name)
				await this.modal.primaryLocations.item.availableLocation(name).click()
				await this.modal.primaryLocations.button.moveToPrimaryLocations.click()
			}
			await this.modal.primaryLocations.button.save.click()
			await expect(this.page.getByText('select primary locations'), 'Primary Locations are set').toBeHidden()
		} catch (error) {
			throw new Error(
				`setting Primary Locations ${locations.join()} due to\n${error.matcherResult ? error.matcherResult.log.join('\n') : error}`
			)
		}
	}

	@step
	async addLine(
		method: 'using New button' | 'using + Add New service button' = 'using New button'
	): Promise<ItineraryBuilderLinePage> {
		await this.handleShortcutsTooltip()
		const builderLines = (await this.table.line.all()).length
		if (method === 'using New button') await this.button.new.click()
		else await this.button.addNewService.click()
		expect((await this.table.line.all()).length, `Builder should now have ${builderLines + 1} line(s)`).toEqual(
			builderLines + 1
		)
		const newLineIndex = method === 'using New button' ? 0 : builderLines
		return new ItineraryBuilderLinePage(this.page, newLineIndex).ready
	}

	@step
	async getLine(number: number): Promise<ItineraryBuilderLinePage> {
		await this.handleShortcutsTooltip()
		return new ItineraryBuilderLinePage(this.page, --number).ready
	}
}
