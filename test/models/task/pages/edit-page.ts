import { expect, Page } from '@playwright/test'
import { SalesforcePage } from '../../../../src/models/pages/salesforce-page'
import { step } from '../../../runners/custom-test-runner'

export class TaskEditPage extends SalesforcePage {
	readonly ready: Promise<this>

	constructor(page: Page) {
		super(page)
		this.ready = expect(this.dialog, 'task edit dialog should be visible')
			.toBeVisible()
			.then(() => this)
	}

	private readonly fields = {
		subject: this.page.getByRole('combobox', { name: 'Subject' }),
		dueDate: this.page.getByRole('textbox', { name: 'Due Date' }),
	}

	private readonly dialog = this.page.getByRole('dialog').filter({ hasText: 'Subject' })

	private readonly buttons = {
		save: this.page.getByRole('button', { name: 'Save' }),
	}

	@step
	async setSubject(subject: string) {
		await this.fields.subject.fill(subject)
		await expect(this.fields.subject, `subject should be filled with ${subject}`).toHaveValue(subject)
	}

	@step
	async setDueDate(dueDate: Date | 'TOMORROW', format: 'en-GB' | 'en-US' = 'en-GB') {
		if (dueDate === 'TOMORROW') {
			dueDate = new Date()
			dueDate.setDate(dueDate.getDate() + 1)
		}
		const date = Intl.DateTimeFormat(format).format(dueDate)
		await this.fields.dueDate.fill(date)
		await expect(this.fields.dueDate, `due date should be filled with ${date}`).toHaveValue(date)
	}

	@step
	async save() {
		await this.buttons.save.click()
		await expect(this.dialog, 'task edit dialog should be hidden').toBeHidden()
	}
}
