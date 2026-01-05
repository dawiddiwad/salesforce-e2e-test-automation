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

	protected select<R extends SalesforceRecord, F extends keyof R>(record: R, fields: F[]): Partial<Pick<R, F>> {
		const selectedFields: Partial<Pick<R, F>> = {}
		for (const key of fields) {
			if (key in record) {
				selectedFields[key] = record[key]
			}
		}
		return selectedFields
	}

	protected filter<R extends SalesforceRecord, F extends keyof R>(record: R, fields: F[]): Omit<R, F> {
		const filteredFields = { ...record }
		for (const key of fields) {
			delete filteredFields[key]
		}
		return filteredFields
	}

	protected processDiff(
		expected: SalesforceRecord,
		actual: SalesforceRecord,
		fields: string[],
		action: 'select' | 'filter'
	) {
		const actualResult = this[action](actual, fields)
		const expectedResult = this[action](expected, fields)
		expect
			.soft(actualResult, `expect ${expected.attributes?.type} ${actual.Id} should match ${expected.Id}`)
			.toMatchObject(expectedResult)
	}

	private setupDiff(expected: SalesforceRecord, actual: SalesforceRecord) {
		return {
			filter: (filter?: FieldFilter) => {
				const fields = filter?.fields || []
				const action = filter ? 'filter' : 'select'
				this.processDiff(expected, actual, fields, action)
			},
		}
	}

	private findMatchingRecordIndex(expected: SalesforceRecord, actual: SalesforceRecord[], fields: string[]): number {
		return actual.findIndex((record) => fields.every((field) => expected[field] === record[field]))
	}

	private assertRecordCount(expected: CompareMapRecords, actual: CompareMapRecords, child: CompareMap) {
		expect
			.soft(
				expected[child.sobject],
				`expect ${child.sobject} records count to be ${actual[child.sobject].length}`
			)
			.toHaveLength(actual[child.sobject].length)
	}

	private assertRecordMatch(
		record: SalesforceRecord,
		fields: string[],
		child: CompareMap,
		actual: CompareMapRecords
	) {
		const matchIndex = this.findMatchingRecordIndex(record, actual[child.sobject], fields)
		expect
			.soft(() => {
				this.assertRecordDefined(actual[child.sobject][matchIndex], record, fields)
				this.performRecordComparison(record, actual[child.sobject][matchIndex], child)
			}, `validate ${record.attributes?.type} record ${record.Id}`)
			.not.toThrow()
		if (child.child) {
			this.compare(child, record, actual[child.sobject][matchIndex])
		}
	}

	private assertRecordDefined(
		matchedRecord: SalesforceRecord | undefined,
		record: SalesforceRecord,
		fields: string[]
	) {
		expect(matchedRecord, `expect ${record.Id} to have a match by ${fields} fields`).toBeDefined()
	}

	private performRecordComparison(record: SalesforceRecord, matchedRecord: SalesforceRecord, child: CompareMap) {
		const filter: FieldFilter = {
			fields: [...(child.fieldFilter?.fields || []), ...(child.child?.map((r) => r.sobject) || [])],
			type: 'filter',
		}
		new SobjectRecordComparator(this.api).setupDiff(record, matchedRecord).filter(filter)
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
			if (child.matchCriteria === 'count()') {
				this.assertRecordCount(expected, actual, child)
				continue
			}
			const fields = child.matchCriteria.fields
			expected[child.sobject].forEach((record) => {
				this.assertRecordMatch(record, fields, child, actual)
			})
		}
	}
}
