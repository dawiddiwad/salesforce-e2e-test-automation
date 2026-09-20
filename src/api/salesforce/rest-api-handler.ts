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
		try {
			this.connection = new Connection({
				instanceUrl: credentials.instanceUrl.origin.toString(),
				accessToken: credentials.accessToken,
				version: this.apiVersion,
			})
			this.ready = this.connection
				.identity()
				.then(() => this)
				.catch(() => {
					throw new Error('unable to authenticate Salesforce Rest API')
				})
		} catch {
			throw new Error('unable to authenticate Salesforce Rest API')
		}
	}

	@step
	async create(sobjectApiName: SObjectNames<Schema>, data: SObjectInputRecord<Schema, string>): Promise<SaveResult> {
		try {
			return await this.connection.create(sobjectApiName, data, { allOrNone: true })
		} catch {
			throw new Error('unable to create Salesforce record')
		}
	}

	@step
	async read(sobjectApiName: SObjectNames<Schema>, recordId: string): Promise<Record> {
		try {
			return await this.connection.retrieve(sobjectApiName, recordId)
		} catch {
			throw new Error('unable to read Salesforce record')
		}
	}

	@step
	async update(sobjectApiName: SObjectNames<Schema>, data: Record): Promise<SaveResult | SaveResult[]> {
		try {
			return await this.connection.update(sobjectApiName, data, { allOrNone: true })
		} catch {
			throw new Error('unable to update Salesforce record')
		}
	}

	@step
	async delete(sobjectApiName: SObjectNames<Schema>, recordId: string): Promise<SaveResult> {
		try {
			return await this.connection.delete(sobjectApiName, recordId)
		} catch {
			throw new Error('unable to delete Salesforce record')
		}
	}

	@step
	async query(soql: string, acceptEmptyResult: boolean = false): Promise<QueryResult<Record[]>> {
		let queryResult: QueryResult<Record[]>
		try {
			queryResult = await this.connection.query<Record[]>(soql)
		} catch {
			throw new Error('failed running Salesforce SOQL query')
		}
		if (!queryResult.records.length && !acceptEmptyResult) {
			throw new EmptyQueryResultError('no records returned by Salesforce SOQL query')
		}
		return queryResult
	}

	@step
	async executeApex(apexBody: string): Promise<ExecuteAnonymousResult> {
		let result: ExecuteAnonymousResult
		try {
			result = await this.connection.tooling.executeAnonymous(apexBody)
		} catch {
			throw new Error('failed executing anonymous Apex')
		}
		if (!result.success) {
			const metadata: string[] = []
			if (typeof result.compiled === 'boolean') metadata.push(`compiled=${result.compiled}`)
			if (Number.isSafeInteger(result.line)) metadata.push(`line=${result.line}`)
			if (Number.isSafeInteger(result.column)) metadata.push(`column=${result.column}`)
			throw new Error(`failed executing anonymous Apex${metadata.length ? ` (${metadata.join(', ')})` : ''}`)
		}
		return result
	}
}
