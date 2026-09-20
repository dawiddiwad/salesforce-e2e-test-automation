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
		try {
			this.api = new Imap({
				user: config.user,
				password: config.password,
				host: config.host,
				port: config.port,
				tls: config.tls,
				tlsOptions: { rejectUnauthorized: false },
			})
		} catch {
			throw new Error('Unable to initialize IMAP connection')
		}
	}

	@step
	async connect(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.api.once('ready', resolve)
			this.api.once('error', reject)
			this.api.once('close', () => {
				this.api.removeListener('ready', resolve)
				this.api.removeListener('error', reject)
			})
			this.api.connect()
		}).catch(() => {
			throw new Error('Unable to connect to IMAP server')
		})
	}

	@step
	async openBox(byName: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.api.openBox(byName, true, (error) => {
				if (error) reject(error)
				else resolve()
			})
		}).catch(() => {
			throw new Error('Unable to open IMAP mailbox')
		})
	}

	@step
	async disconnect(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.api.once('close', () => {
				this.api.removeListener('error', reject)
				resolve()
			})
			this.api.once('error', reject)
			this.api.end()
		}).catch(() => {
			throw new Error('Unable to disconnect from IMAP server')
		})
	}

	@step
	async searchByTypeAndValue(type: string, value: string): Promise<number[]> {
		return new Promise<number[]>((resolve, reject) => {
			this.api.search([[type, value]], (error, results) => {
				if (error) reject(error)
				else resolve(results)
			})
		}).catch(() => {
			throw new Error('Unable to search IMAP mailbox')
		})
	}
}
