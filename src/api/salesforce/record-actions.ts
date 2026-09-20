import { Record } from 'jsforce'
import { step } from '../../runners/step'
import { RestApiHandler } from './rest-api-handler'

export class SobjectRecordActions {
	private readonly api: RestApiHandler

	constructor(api: RestApiHandler) {
		this.api = api
	}

	@step
	async getChildRecords<T extends string>(
		parentSobjectId: string,
		parentSobjectName: string,
		childSobjectRelationName: T
	): Promise<Record[]> {
		return await this.api
			.query(
				`SELECT (SELECT FIELDS(ALL) FROM ${childSobjectRelationName} LIMIT 200) FROM ${parentSobjectName} WHERE Id = '${parentSobjectId}'`
			)
			.then((result) => {
				const childs: Record[] = []
				result.records.forEach((record) => {
					const recordWithRelations = record as unknown as {
						[key: string]: { records: Record[] } | undefined
					}
					const childRelation = recordWithRelations[childSobjectRelationName]
					const childRecords = childRelation?.records ?? []
					childRecords.forEach((childRecord) => childs.push(childRecord))
				})
				return childs
			})
	}
}
