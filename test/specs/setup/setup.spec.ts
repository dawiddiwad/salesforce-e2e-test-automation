import { test } from '../../runners/custom-test-runner'
import { RecordCleanupServiceEnvironmentVariables as Flags } from '../../models/record-cleanup/types'

test.describe.parallel('setup suite', async () => {
	test('data storage check and cleanup', async ({ api }) => {
		const cleanupTresholdMB = 10
		const cleanupCutoffDays = 1
		if ((await api.limits.getRemainingDataStorageMB()) > cleanupTresholdMB) {
			return
		} else {
			console.warn(`⚠️ less than ${cleanupTresholdMB}MB of data storage remaining`)
			if (!process.env[Flags.enabled] || process.env[Flags.enabled] !== 'true') {
				console.warn(
					`⚠️ data storage cleanup is disabled, to enable set ${Flags.enabled} environment variable to true`
				)
				test.skip()
				return
			} else {
				console.info(`👉 deleting data for last ${cleanupCutoffDays} day(s)`)
				await api.storage.cleanup.deleteDataForLast({ days: cleanupCutoffDays })
			}
		}
	})
})
