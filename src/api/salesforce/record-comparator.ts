import { expect } from '@playwright/test'
import { Record as SalesforceRecord } from 'jsforce'
import { RestApiHandler } from './rest-api-handler'
import { SobjectRecordActions } from './record-actions'

type Filter = 'select' | 'filter'

export type FieldFilter = {
	type: Filter
	fields: string[]
}

export type MatchCriteria = { fields: string[] } | 'count()'

export type CompareMap = {
	sobject: string
	matchCriteria: MatchCriteria
	fieldFilter?: FieldFilter
	child?: CompareMap[]
}

export type CompareMapRecords = Record<string, SalesforceRecord[]>

export class SobjectRecordComparator {
	protected api: RestApiHandler

	constructor(api: RestApiHandler) {
		this.api = api
	}

	protected select(record: SalesforceRecord, fields: string[]): SalesforceRecord {
		const selectedFields: SalesforceRecord = {}
		for (const key of fields) {
			expect(Object.hasOwn(record, key), `expected selected field ${key} to exist`).toBe(true)
			selectedFields[key] = record[key]
		}
		return selectedFields
	}

	protected filter(record: SalesforceRecord, fields: string[]): SalesforceRecord {
		const filteredFields = { ...record }
		for (const key of fields) {
			delete filteredFields[key]
		}
		return filteredFields
	}

	private performRecordComparison(expected: SalesforceRecord, actual: SalesforceRecord, map: CompareMap) {
		const children = map.child?.map((child) => child.sobject) ?? []
		const expectedFields = this.filter(expected, children)
		const actualFields = this.filter(actual, children)
		const action = map.fieldFilter?.type ?? 'filter'
		const fields = map.fieldFilter?.fields ?? []
		if (action === 'select') {
			expect(fields, `${map.sobject} must select at least one field`).not.toHaveLength(0)
		}
		expect(
			this[action](actualFields, fields),
			`${map.sobject} record ${actual.Id} should match expected record ${expected.Id}`
		).toEqual(this[action](expectedFields, fields))
	}

	async getRecords(map: CompareMap, api: RestApiHandler, recordId: string): Promise<CompareMapRecords> {
		const actions = new SobjectRecordActions(api)
		const fetch = async (
			map: CompareMap,
			parent: SalesforceRecord,
			recordId: string
		): Promise<SalesforceRecord> => {
			for (const child of map.child ?? []) {
				parent[child.sobject] = await actions.getChildRecords(
					recordId,
					map.sobject.replace('s__r', '__c'),
					child.sobject
				)
				if (child.child) {
					for (const relation of parent[child.sobject]) {
						await fetch(child, relation, relation.Id as string)
					}
				}
			}
			return parent
		}
		return fetch(map, {}, recordId)
	}

	compare(map: CompareMap, expected: CompareMapRecords, actual: CompareMapRecords) {
		for (const child of map.child ?? []) {
			const expectedRecords = expected[child.sobject]
			const actualRecords = actual[child.sobject]
			expect(Array.isArray(expectedRecords), `expected ${child.sobject} collection must exist`).toBe(true)
			expect(Array.isArray(actualRecords), `actual ${child.sobject} collection must exist`).toBe(true)
			expect(actualRecords, `${child.sobject} record count must match`).toHaveLength(expectedRecords.length)
			if (child.matchCriteria === 'count()') continue

			const fields = child.matchCriteria.fields
			expect(fields, `${child.sobject} must specify matching fields`).not.toHaveLength(0)
			for (const record of [...expectedRecords, ...actualRecords]) {
				for (const field of fields) {
					expect(
						record[field],
						`${child.sobject} record ${record.Id} must define match field ${field}`
					).not.toBeUndefined()
				}
			}

			const unmatched = [...actualRecords]
			for (const record of expectedRecords) {
				const matches = unmatched.filter((candidate) =>
					fields.every((field) => record[field] === candidate[field])
				)
				expect(
					matches,
					`${child.sobject} record ${record.Id} must have exactly one match by ${fields.join(', ')}`
				).toHaveLength(1)
				const matchedRecord = matches[0]
				unmatched.splice(unmatched.indexOf(matchedRecord), 1)
				this.performRecordComparison(record, matchedRecord, child)
				this.compare(child, record, matchedRecord)
			}
		}
	}
}
