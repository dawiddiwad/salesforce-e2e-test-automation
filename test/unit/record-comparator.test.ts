import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	SobjectRecordComparator,
	type CompareMap,
	type CompareMapRecords,
} from '../../src/api/salesforce/record-comparator'
import { RestApiHandler } from '../../src/api/salesforce/rest-api-handler'

const comparator = new SobjectRecordComparator(Object.create(RestApiHandler.prototype) as RestApiHandler)
const map: CompareMap = {
	sobject: 'Parent',
	matchCriteria: 'count()',
	child: [
		{
			sobject: 'Items',
			matchCriteria: { fields: ['Name'] },
			fieldFilter: { type: 'filter', fields: ['Id'] },
		},
	],
}
const item = (name: string, price = 10, id = name) => ({ Id: id, Name: name, Price: price })
const records = (...items: ReturnType<typeof item>[]): CompareMapRecords => ({ Items: items })

test('accepts equal collections in a different order and ignores configured volatile fields', () => {
	comparator.compare(map, records(item('A'), item('B')), records(item('B', 10, 'new-B'), item('A', 10, 'new-A')))
})

test('rejects a lost item after an amendment is merged', () => {
	assert.throws(() => comparator.compare(map, records(item('A'), item('B')), records(item('A'))), /toHaveLength/)
})

test('rejects unexpected extra records, including an empty expected collection', () => {
	assert.throws(() => comparator.compare(map, records(item('A')), records(item('A'), item('B'))), /toHaveLength/)
	assert.throws(() => comparator.compare(map, records(), records(item('A'))), /toHaveLength/)
	comparator.compare(map, records(), records())
})

test('does not reuse one actual record for two expected records', () => {
	assert.throws(
		() =>
			comparator.compare(
				map,
				records(item('A', 10, 'first'), item('A', 10, 'second')),
				records(item('A'), item('B'))
			),
		/toHaveLength/
	)
})

test('rejects ambiguous duplicate match keys instead of guessing', () => {
	assert.throws(
		() =>
			comparator.compare(
				map,
				records(item('A'), item('B')),
				records(item('A', 10, 'first'), item('A', 10, 'second'))
			),
		/toHaveLength/
	)
})

test('rejects a different key or changed field even when counts match', () => {
	assert.throws(() => comparator.compare(map, records(item('A')), records(item('B'))), /toHaveLength/)
	assert.throws(() => comparator.compare(map, records(item('A')), records(item('A', 999))), /toEqual/)
})

test('compares all fields when no filter is supplied', () => {
	const unfiltered: CompareMap = { ...map, child: [{ sobject: 'Items', matchCriteria: { fields: ['Name'] } }] }
	assert.throws(() => comparator.compare(unfiltered, records(item('A')), records(item('A', 999))), /toEqual/)
	assert.throws(
		() => comparator.compare(unfiltered, records(item('A')), { Items: [{ ...item('A'), Extra: true }] }),
		/toEqual/
	)
})

test('honors select filters and requires selected fields to be present', () => {
	const selected: CompareMap = {
		...map,
		child: [
			{
				sobject: 'Items',
				matchCriteria: { fields: ['Name'] },
				fieldFilter: { type: 'select', fields: ['Price'] },
			},
		],
	}
	comparator.compare(selected, records(item('A')), { Items: [{ ...item('A', 10, 'new-A'), Ignored: 'value' }] })
	assert.throws(() => comparator.compare(selected, records(item('A')), records(item('A', 999))), /toEqual/)
	assert.throws(() => comparator.compare(selected, { Items: [{ Name: 'A' }] }, { Items: [{ Name: 'A' }] }), /toBe/)
})

test('requires collections and nonempty, defined matching fields', () => {
	assert.throws(() => comparator.compare(map, {}, records()), /toBe/)
	assert.throws(() => comparator.compare(map, records(), {}), /toBe/)
	assert.throws(
		() => comparator.compare(map, { Items: [{ Price: 10 }] }, { Items: [{ Price: 10 }] }),
		/toBeUndefined/
	)
	assert.throws(
		() =>
			comparator.compare(
				{ ...map, child: [{ sobject: 'Items', matchCriteria: { fields: [] } }] },
				records(),
				records()
			),
		/toHaveLength/
	)
})

test('validates nested collections independently of parent field filtering', () => {
	const nested: CompareMap = {
		...map,
		child: [{ ...map.child![0], child: [{ sobject: 'Notes', matchCriteria: 'count()' }] }],
	}
	const expected = { Items: [{ ...item('A'), Notes: [{ Text: 'original' }] }] }
	comparator.compare(nested, expected, {
		Items: [{ ...item('A'), Notes: [{ Text: 'count-only intentionally ignores content' }] }],
	})
	assert.throws(() => comparator.compare(nested, expected, { Items: [{ ...item('A'), Notes: [] }] }), /toHaveLength/)
	assert.throws(() => comparator.compare(nested, expected, records(item('A'))), /toBe/)
})

test('recursively detects missing field-matched children', () => {
	const nested: CompareMap = {
		...map,
		child: [{ ...map.child![0], child: [{ sobject: 'Details', matchCriteria: { fields: ['Name'] } }] }],
	}
	assert.throws(
		() =>
			comparator.compare(
				nested,
				{ Items: [{ ...item('A'), Details: [item('nested')] }] },
				{ Items: [{ ...item('A'), Details: [] }] }
			),
		/toHaveLength/
	)
})
