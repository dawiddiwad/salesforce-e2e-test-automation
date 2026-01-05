import { Connection, QueryResult, Record, SaveResult, Schema, SObjectInputRecord, SObjectNames } from 'jsforce'
import { ExecuteAnonymousResult } from 'jsforce/lib/api/tooling'
import { step } from '../../../test/runners/custom-test-runner'

export type RestHandlerCredentials = {
	accessToken: string
	instanceUrl: URL
}

export class EmptyQueryResultError extends Error {
	constructor(message: string) {
		super(message)
	}
}

export class RestApiHandler {
	private readonly apiVersion: string = '61.0'
	readonly connection: Connection
	readonly ready: Promise<this>

	constructor(credentials: RestHandlerCredentials, apiVersion?: string) {
		if (apiVersion) {
			this.apiVersion = apiVersion
		}
		this.connection = new Connection({
			instanceUrl: credentials.instanceUrl.origin.toString(),
			accessToken: credentials.accessToken,
			version: this.apiVersion,
		})
		try {
			this.ready = this.connection.identity().then(() => this)
		} catch (error) {
			throw new Error(`unable to authenticate Salesforce Rest API due to:\n${error}`)
		}
	}

	@step
	async create(sobjectApiName: SObjectNames<Schema>, data: SObjectInputRecord<Schema, string>): Promise<SaveResult> {
		try {
			return await this.connection.create(sobjectApiName, data, { allOrNone: true })
		} catch (error) {
			throw new Error(`unable to create ${sobjectApiName} due to:\n${error}`)
		}
	}

	@step
	async read(sobjectApiName: SObjectNames<Schema>, recordId: string): Promise<Record> {
		try {
			return await this.connection.retrieve(sobjectApiName, recordId)
		} catch (error) {
			throw new Error(`unable to read ${sobjectApiName} record ${recordId} due to:\n${error}`)
		}
	}

	@step
	async update(sobjectApiName: SObjectNames<Schema>, data: Record): Promise<SaveResult | SaveResult[]> {
		try {
			return await this.connection.update(sobjectApiName, data, { allOrNone: true })
		} catch (error) {
			throw new Error(
				`unable to update ${sobjectApiName} with data:\n${JSON.stringify(data, null, 3)}\ndue to:\n${error}`
			)
		}
	}

	@step
	async delete(sobjectApiName: SObjectNames<Schema>, recordId: string): Promise<SaveResult> {
		try {
			return await this.connection.delete(sobjectApiName, recordId)
		} catch (error) {
			throw new Error(`unable to delete ${sobjectApiName} record ${recordId} due to:\n${error}`)
		}
	}

	@step
	async query(soql: string, acceptEmptyResult: boolean = false): Promise<QueryResult<Record[]>> {
		try {
			const queryResult = await this.connection.query<Record[]>(soql)
			if (!queryResult.records.length && !acceptEmptyResult) {
				throw new EmptyQueryResultError(`no records returned using SOQL:\n${soql}`)
			} else return queryResult
		} catch (error) {
			throw new Error(`failed running SOQL query:\n${soql}\ndue to:\n${error}`)
		}
	}

	@step
	async executeApex(apexBody: string): Promise<ExecuteAnonymousResult> {
		try {
			const result = await this.connection.tooling.executeAnonymous(apexBody)
			if (!result.success) {
				throw new Error(JSON.stringify(result, null, 3))
			} else return result
		} catch (error) {
			throw new Error(`failed executing anonymous Apex:\n${apexBody}\ndue to:\n${error}`)
		}
	}
}
