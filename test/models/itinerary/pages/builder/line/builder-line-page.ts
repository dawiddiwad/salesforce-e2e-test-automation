import { expect, Locator, Page } from '@playwright/test'
import { BuilderColumn, Location, Service, ServiceCatalog } from '../../../types/tab-builder'
import { GeneralNamingPolicy } from '../../../../../policies/general'
import { step } from '../../../../../runners/custom-test-runner'
import { ItineraryBuilderTemplateSearchPage } from '../template-search.page'
import { SalesforcePage } from '../../../../../../src/models/pages/salesforce-page'
import { AddOnsPopover } from './addons-popover'
import { OccupancyChangeModal } from './occupancy-change-modal'
import { PriceCategoriesPopover } from './price-category-popover'
import { Quote } from '../../../types/quote'
import { RailSearchPage } from '../rail-search/rail-search-page'

export class ItineraryBuilderLinePage extends SalesforcePage {
	private readonly lineIndex: number
	private readonly quote: Quote
	private currentLine: Locator
	readonly ready: Promise<this>

	constructor(page: Page, lineIndex: number) {
		super(page)
		this.lineIndex = lineIndex
		this.quote = new Quote()
		this.currentLine = this.table.line.nth(lineIndex)
		this.ready = expect(this.currentLine, `line ${lineIndex + 1} should be visible`)
			.toBeVisible()
			.then(() => this.waitForOptionalSpinners())
			.then(() => this)
	}

	private readonly table = {
		container: this.page.locator('.builder-table'),
		headers: this.page.locator('.builder-table thead tr th'),
		line: this.page.locator('.builder-table c-lwc-itinerary-builder-line'),
		lineBorder: {
			addTemplateButton: this.page.locator(
				"//span[@data-source-type='template' and @class='line-border-button']"
			),
			addLineButton: this.page.locator("//span[@class='line-border-button' and descendant::*[@data-key='add']]"),
		},
		spinner: this.page.getByLabel('Builder').getByRole('status'),
	}

	private readonly column = {
		serviceType: {
			input: {
				searchServiceTypes: this.page.getByPlaceholder('Search Service Types'),
			},
			item: {
				searchResult: (name: string) => this.page.locator('.option-container').getByText(name, { exact: true }),
			},
			button: {
				selectServiceType: this.page.locator('.record-type-dropdown'),
			},
		},
		location: {
			input: {
				searchLocations: this.page.getByPlaceholder('Search Locations'),
			},
			item: {
				searchResult: (name: string) => this.page.locator('.option-container').getByText(name, { exact: true }),
			},
			button: {
				selectLocation: this.page.locator('[data-name="popover:location"]'),
			},
		},
		serviceName: {
			input: {
				searchService: this.page.getByPlaceholder('Search Services'),
			},
			item: {
				searchResult: (name: string) => this.page.locator('.option-container').getByText(name, { exact: true }),
			},
			button: {
				selectService: this.page.locator('.record-service-dropdown'),
			},
		},
		priceCategory: {
			edit: () => this.page.locator("//*[@data-name='popover:priceCategory']").nth(this.lineIndex).click(),
		},
		addOns: {
			edit: () => this.page.locator("//*[@data-name='popover:addons']").nth(this.lineIndex).click(),
		},
		dates: {
			start: {
				edit: () => this.currentLine.locator("//*[@data-name='popover:dateTime']").nth(0).click(),
			},
			popoverHeader: this.page.getByText('Dates', { exact: true }),
			durationCounter: () => this.page.locator('.slds-input_counter'),
			durationIncrement: () => this.page.getByRole('button', { name: 'Increment' }),
			durationDecrement: () => this.page.getByRole('button', { name: 'Decrement' }),
			applyButton: () => this.page.getByRole('button', { name: 'Apply', exact: true }),
		},
		moreActions: {
			button: {
				show: this.page.locator("button[name='popover\\:line-actions']"),
				addItineraryNotes: this.page.getByTitle('Add Itinerary Notes', { exact: true }),
				clone: this.page.getByTitle('Clone', { exact: true }),
				delete: this.page.getByTitle('Delete', { exact: true }),
				viewContent: this.page.getByTitle('View Content', { exact: true }),
				changePackageOccupancy: this.page.getByRole('menuitem', {
					name: 'Change Package Occupancy',
					exact: true,
				}),
			},
		},
	}

	private readonly itineraryNotes = {
		item: {
			clientDocumentNotes: this.page.locator("//*[@data-name='PackageNamespace__CustomerNotes__c']"),
			internalNotes: this.page.locator("//*[@data-name='PackageNamespace__Internal_Notes__c']"),
			supplierNotes: this.page.locator("//*[@data-name='PackageNamespace__Supplier_Notes__c']"),
			voucherNotes: this.page.locator("//*[@data-name='PackageNamespace__Voucher_Notes__c']"),
		},
		input: {
			clientDocumentNotes: this.page
				.locator("//*[@data-name='PackageNamespace__CustomerNotes__c']")
				.locator("//*[@data-placeholder='Put your note here...']"),
			internalNotes: this.page.locator("//*[@name='PackageNamespace__Internal_Notes__c']"),
			supplierNotes: this.page.locator("//*[@name='PackageNamespace__Supplier_Notes__c']"),
			voucherNotes: this.page.locator("//*[@name='PackageNamespace__Voucher_Notes__c']"),
		},
		button: {
			addNotes: this.page.getByRole('button', { name: 'Add Notes', exact: true }),
			apply: this.page.getByRole('button', { name: 'Apply', exact: true }),
			close: this.page.getByTitle('Close dialog'),
		},
	}

	private readonly impactSubsequentServicesPopover = {
		header: this.page.getByText('Impact subsequent services?', { exact: true }),
		button: {
			yes: this.page.getByRole('button', { name: 'Yes, update', exact: true }),
			no: this.page.getByRole('button', { name: 'No, leave it', exact: true }),
			confirm: this.page.getByRole('button', { name: 'Confirm', exact: true }),
			unselectAll: this.page.getByRole('button', { name: 'Unselect All', exact: true }),
			close: this.page.getByRole('button', { name: 'close Close', exact: true }),
		},
	}

	@step
	async openPriceCategoriesPopover() {
		await this.column.priceCategory.edit()
		return new PriceCategoriesPopover(this.page).ready
	}

	@step
	async openAddOnsPopover() {
		await this.column.addOns.edit()
		return new AddOnsPopover(this.page).ready
	}

	@step
	async openOccupancyChangeModal() {
		await this.column.moreActions.button.show.nth(this.lineIndex).click()
		await this.column.moreActions.button.changePackageOccupancy.click()
		return new OccupancyChangeModal(this.page).ready
	}

	@step
	async addTemplate(name: string) {
		const linesBeforeTemplate = (await this.table.line.all()).length
		const lineBox = await this.table.line.nth(this.lineIndex).boundingBox()
		if (lineBox) {
			await this.page.mouse.move(lineBox.x + lineBox.width / 2, lineBox.y + lineBox.height)
			await this.table.lineBorder.addTemplateButton.nth(this.lineIndex).click()
			await new ItineraryBuilderTemplateSearchPage(this.page).insertTemplate(name)
			await expect(this.table.line, `Builder has more than ${linesBeforeTemplate} line(s)`).not.toHaveCount(
				linesBeforeTemplate
			)
		} else
			throw new Error(`unable to add Template to line number ${this.lineIndex + 1} due to line being not visible`)
	}

	@step
	async addLineBelow() {
		const linesBeforeTemplate = (await this.table.line.all()).length
		const lineBox = await this.table.line.nth(this.lineIndex).boundingBox()
		if (lineBox) {
			await this.page.mouse.move(lineBox.x + lineBox.width / 2, lineBox.y + lineBox.height)
			await this.table.lineBorder.addLineButton.nth(this.lineIndex).click()
			await expect(this.table.line, `Builder has more than ${linesBeforeTemplate} line(s)`).toHaveCount(
				linesBeforeTemplate + 1
			)
			return new ItineraryBuilderLinePage(this.page, this.lineIndex + 1).ready
		} else throw new Error(`unable to add a new line below due to line ${this.lineIndex + 1} being not visible`)
	}

	@step
	async addNotes(text?: string) {
		text = text ? text : GeneralNamingPolicy.shortText()
		await this.column.moreActions.button.show.nth(this.lineIndex).click()
		await this.column.moreActions.button.addItineraryNotes.click()
		await this.itineraryNotes.input.clientDocumentNotes.fill(text)
		await this.itineraryNotes.input.internalNotes.fill(text)
		await this.itineraryNotes.input.supplierNotes.fill(text)
		await this.itineraryNotes.input.voucherNotes.fill(text)
		await this.itineraryNotes.button.apply.click()
		await this.itineraryNotes.button.close.click()
		await expect(
			this.page.getByText('Itinerary Notes', { exact: true }),
			'Itinerary Notes are added and closed'
		).toBeHidden()
	}

	@step
	async setPriceCategory(name: string) {
		await this.openPriceCategoriesPopover().then(async (popover) => {
			await popover.setPriceCategory(name)
			await popover.applyChanges()
		})
		expect(await this.read('Price Category'), `Price Category should be set to ${name}`).toContain(name)
	}

	@step
	async setService<Type extends keyof ServiceCatalog>(item: Service<Type>): Promise<void> {
		try {
			await this.column.serviceType.input.searchServiceTypes.waitFor({ timeout: 1000 })
		} catch (error) {
			if (error instanceof Error && error.name.includes('TimeoutError')) {
				await this.column.serviceType.button.selectServiceType.nth(this.lineIndex).click()
				return this.setService(item)
			} else throw error
		}
		await this.column.serviceType.input.searchServiceTypes.fill(item.type)
		await this.column.serviceType.item.searchResult(item.type).click()
		await this.column.serviceName.button.selectService.nth(this.lineIndex).click()
		try {
			await this.column.serviceType.item.searchResult(item.name).waitFor({ timeout: 10000 })
			await this.column.serviceName.item.searchResult(item.name).click()
		} catch (error) {
			if (error instanceof Error && error.name.includes('TimeoutError')) {
				await this.column.serviceName.input.searchService.fill(item.name)
				await this.column.serviceName.item.searchResult(item.name).click()
			} else throw error
		}
		await this.waitForSpinners()
		expect(await this.read('Service'), `${item.name} service is set`).toContain(item.name)
	}

	@step
	async read(column: BuilderColumn) {
		await this.table.container.waitFor({ state: 'visible' })
		const columnIndex = await this.table.headers
			.allTextContents()
			.then((headers) => headers.findIndex((label) => label.trim() === column))
		return (await this.table.line
			.nth(this.lineIndex)
			.locator('tr')
			.first()
			.locator('td')
			.nth(columnIndex)
			.textContent()) as string
	}

	@step
	async getNotes() {
		await this.column.moreActions.button.show.nth(this.lineIndex).click()
		await this.column.moreActions.button.addItineraryNotes.click()
		const notes = {
			clientDocumentNotes: await this.itineraryNotes.input.clientDocumentNotes.textContent(),
			internalNotes: await this.itineraryNotes.input.internalNotes.textContent(),
			supplierNotes: await this.itineraryNotes.input.supplierNotes.textContent(),
			voucherNotes: await this.itineraryNotes.input.voucherNotes.textContent(),
		}
		await this.itineraryNotes.button.close.click()
		await expect(
			this.page.getByText('Itinerary Notes', { exact: true }),
			'Itinerary Notes are read and closed'
		).toBeHidden()
		return notes
	}

	@step
	async getSellPrice() {
		try {
			return this.quote.getPrice(await this.read('Sell Price'))
		} catch (error) {
			throw new Error(`getting Sell Price for line ${this.lineIndex + 1}\n${error}`)
		}
	}

	@step
	async changeAccomodationDates(using: { days: number; impactSubsequentServices: boolean }) {
		await this.column.dates.start.edit()
		await expect(this.column.dates.popoverHeader, `dates popover should be visible`).toBeVisible()
		const currentDuration: number = Number(await this.column.dates.durationCounter().inputValue())

		let durationDelta = using.days
		if (using.days > 0) {
			while (durationDelta-- > 0) {
				await this.column.dates.durationIncrement().click()
			}
		} else {
			while (durationDelta++ < 0) {
				await this.column.dates.durationDecrement().click()
			}
		}
		await expect(this.column.dates.durationCounter(), `duration should be changed by ${using.days}`).toHaveValue(
			`${currentDuration + using.days}`
		)
		await this.column.dates.applyButton().click()
		await expect(this.column.dates.popoverHeader, `dates popover should be hidden`).toBeHidden()

		if (using.impactSubsequentServices) {
			await this.impactSubsequentServicesPopover.button.yes.click()
			await this.waitForSpinners()
			await this.impactSubsequentServicesPopover.button.confirm.click()
			await this.waitForOptionalSpinners()
			await expect(
				this.impactSubsequentServicesPopover.header,
				`impact subsequent services popover should be hidden`
			).toBeHidden()
		}
	}

	@step
	async openRailSearch() {
		await this.column.dates.start.edit()
		return new RailSearchPage(this.page).ready
	}

	@step
	async setLocation(name: Location) {
		await this.column.location.button.selectLocation.nth(this.lineIndex).click()
		await this.column.location.input.searchLocations.fill(name)
		await this.column.location.item.searchResult(name).click()
		expect(await this.read('Location'), `location should be set to ${name}`).toContain(name)
	}
}
