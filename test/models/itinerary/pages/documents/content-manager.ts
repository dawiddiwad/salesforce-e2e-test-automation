import { Page } from '@playwright/test'

export class ItineraryContentManager {
	static readonly frame = (page: Page) => page.frameLocator('iframe[title="Content Manager"]')
}
