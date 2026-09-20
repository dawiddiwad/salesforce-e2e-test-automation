import Imap from 'imap'
import { EmailApiHandler } from './handler'
import { step } from '../../runners/step'
import { diagnostic, secrets } from '../../errors/redaction'

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
		secrets.register(config.password)
		try {
			this.api = new Imap({
				user: config.user,
				password: config.password,
				host: config.host,
				port: config.port,
				tls: config.tls,
				tlsOptions: { rejectUnauthorized: false },
			})
		} catch (error) {
			throw diagnostic('Unable to initialize IMAP connection', error)
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
		}).catch((error: unknown) => {
			throw diagnostic('Unable to connect to IMAP server', error)
		})
	}

	@step
	async openBox(byName: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.api.openBox(byName, true, (error) => {
				if (error) reject(error)
				else resolve()
			})
		}).catch((error: unknown) => {
			throw diagnostic('Unable to open IMAP mailbox', error)
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
		}).catch((error: unknown) => {
			throw diagnostic('Unable to disconnect from IMAP server', error)
		})
	}

	@step
	async searchByTypeAndValue(type: string, value: string): Promise<number[]> {
		return new Promise<number[]>((resolve, reject) => {
			this.api.search([[type, value]], (error, results) => {
				if (error) reject(error)
				else resolve(results)
			})
		}).catch((error: unknown) => {
			throw diagnostic('Unable to search IMAP mailbox', error)
		})
	}
}
