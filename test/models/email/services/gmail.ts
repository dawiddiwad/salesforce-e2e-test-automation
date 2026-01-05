import { EmailService } from '../../../../src/models/services/email-service'
import { ImapConfig, ImapHandler } from '../../../../src/api/email/imap-handler'
import { step } from '../../../runners/custom-test-runner'

export class GmailConfig {
	static get local(): ImapConfig {
		const user = process.env.GMAIL_USER
		const password = process.env.GMAIL_PASSWORD
		if (!user || !password) throw new Error('both GMAIL_USER and GMAIL_PASSWORD environment variables must be set')
		else
			return {
				user: user,
				password: password,
				host: 'imap.gmail.com',
				port: 993,
				tls: true,
			}
	}
}

export class GmailService implements EmailService {
	readonly api: ImapHandler

	constructor() {
		this.api = new ImapHandler(GmailConfig.local)
	}

	@step
	async findByRecipient(text: string): Promise<number[]> {
		try {
			await this.api.connect()
			await this.api.openBox('INBOX')
			return this.api.searchByTypeAndValue('TO', text)
		} catch (error) {
			throw new Error(`Error finding inbox messages for recipient with text ${text} due to\n${error}`)
		} finally {
			await this.api.disconnect()
		}
	}
}
