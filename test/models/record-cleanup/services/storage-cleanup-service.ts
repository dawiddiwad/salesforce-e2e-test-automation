import jsforce from 'jsforce'
import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { step } from '../../../runners/custom-test-runner'

export class StorageCleanupService extends SalesforceService {
	@step
	private async bulkDeleteFor(records: { object: string; lastDays: number }) {
		const results = await this.api.connection
			.sobject(records.object)
			.find({
				CreatedDate: jsforce.Date.LAST_N_DAYS(records.lastDays),
			})
			.destroy({
				allowBulk: true,
				bulkThreshold: 200,
				bulkApiVersion: 2,
			})

		const errors = results
			.filter((result) => !result.success)
			.map((failure) => failure.errors.map((error) => JSON.stringify(error)).join('\n'))
		if (errors.length)
			throw new Error(
				`${records.object} records for last ${records.lastDays} days could not be deleted\n${errors.join('\n')}`
			)
	}

	@step
	async deleteDataForLast(last: { days: number }) {
		const objects = [
			'PackageNamespace__PassengerItineraryUnitAssignment__c',
			'PackageNamespace__ItineraryPriceLine__c',
			'PackageNamespace__ItineraryBooking__c',
			'PackageNamespace__ItineraryService__c',
		]
		const results = await Promise.allSettled(
			objects.map((name) => this.bulkDeleteFor({ object: name, lastDays: last.days }))
		)
		const failures = results.flatMap((result, index) => {
			if (result.status === 'fulfilled') return []
			const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
			return [new Error(`${objects[index]}: ${reason}`)]
		})
		if (failures.length) {
			throw new AggregateError(
				failures,
				`Storage cleanup failed for ${failures.length} object(s):\n${failures.map((error) => error.message).join('\n')}`
			)
		}
	}
}
