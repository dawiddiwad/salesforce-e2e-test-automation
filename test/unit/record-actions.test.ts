import assert from 'node:assert/strict'
import { test } from 'node:test'
import { test as reportingTest } from '@playwright/test'
import { SobjectRecordActions } from '../../src/api/salesforce/record-actions'
import { EmptyQueryResultError, RestApiHandler } from '../../src/api/salesforce/rest-api-handler'
import { SobjectRecordComparator, type CompareMap } from '../../src/api/salesforce/record-comparator'

function apiReturning(records: object[]) {
	const api = Object.create(RestApiHandler.prototype) as RestApiHandler
	Object.defineProperty(api, 'connection', {
		value: { query: async () => ({ records, totalSize: records.length, done: true }) },
	})
	return api
}

test('an existing parent with no children returns an empty collection', async (t) => {
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	for (const relation of [null, { records: [] }]) {
		const api = apiReturning([{ Id: 'parent', Items: relation }])
		assert.deepEqual(await new SobjectRecordActions(api).getChildRecords('parent', 'Parent', 'Items'), [])
	}
})

test('a missing parent cannot masquerade as a valid empty collection', async (t) => {
	t.mock.method(reportingTest, 'step', async (_name: string, body: () => Promise<unknown>) => body())
	const api = apiReturning([])
	const map: CompareMap = {
		sobject: 'Parent',
		matchCriteria: 'count()',
		child: [{ sobject: 'Items', matchCriteria: 'count()' }],
	}
	await assert.rejects(
		new SobjectRecordActions(api).getChildRecords('missing', 'Parent', 'Items'),
		EmptyQueryResultError
	)
	await assert.rejects(new SobjectRecordComparator(api).getRecords(map, api, 'missing'), EmptyQueryResultError)
})
