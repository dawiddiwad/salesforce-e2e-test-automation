import type { Record } from 'jsforce'

export async function updateLockSellPriceBaseline(
	api: { update(sobject: string, data: Record): Promise<unknown> },
	sourceLines: readonly Record[],
	getPriceLines: () => Promise<Record[]>
): Promise<Record[]> {
	await Promise.all(
		sourceLines
			.filter((line) => ['SELLTAX', 'RESCOMMISSION'].includes(line.PackageNamespace__EntryType__c))
			.map((line) =>
				api.update('PackageNamespace__ItineraryPriceLine__c', {
					Id: line.Id,
					PackageNamespace__Value__c: 500,
				})
			)
	)
	return await getPriceLines()
}
