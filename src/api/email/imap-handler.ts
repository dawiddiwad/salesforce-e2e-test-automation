import Imap from 'imap'
import { EmailApiHandler } from './handler'
import { step } from '../../../test/runners/custom-test-runner'

export type ImapConfig = {
	user: string
	password: string
	host: string
	port: number
	tls: boolean
}

export class ImapHandler implements EmailApiHandler {
	readonly api: Imap

	constructor(config: ImapConfig) {
		this.api = new Imap({
			user: config.user,
			password: config.password,
			host: config.host,
			port: config.port,
			tls: config.tls,
			tlsOptions: { rejectUnauthorized: false },
		})
	}

	@step
	async connect(): Promise<void> {
		return new Promise((resolve) => {
			this.api.once('ready', () => {
				resolve()
			})
			this.api.once('error', (error) => {
				throw new Error(`Error connecting to IMAP server due to\n${error}`)
			})
			this.api.connect()
		})
	}

	@step
	async openBox(byName: string): Promise<void> {
		return new Promise((resolve) => {
			this.api.openBox(byName, true, (error) => {
				if (error) throw new Error(`Error opening box${byName} due to\n${error}`)
				else resolve()
			})
		})
	}

	@step
	async disconnect(): Promise<void> {
		return new Promise((resolve) => {
			this.api.once('close', resolve)
			this.api.end()
		})
	}

	@step
	async searchByTypeAndValue(type: string, value: string): Promise<number[]> {
		return new Promise((resolve) => {
			this.api.search([[type, value]], (error, results) => {
				if (error) throw new Error(`Error searching by type ${type} and value ${value} due to\n${error}`)
				else resolve(results)
			})
		})
	}
}
