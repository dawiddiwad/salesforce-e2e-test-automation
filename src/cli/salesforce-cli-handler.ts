import { exec } from 'child_process'
import stripAnsi from 'strip-ansi'

export type CliCommand = {
	command: string
	flags?: Array<string>
	log?: boolean
}

export class SalesforceCliHandler {
	private readonly defaultPath: string = 'sf'

	constructor(path?: string) {
		if (path) {
			this.defaultPath = path
		}
	}

	private join(flags: string[]): string {
		return flags.join(' ')
	}

	private ignored(error: string): boolean {
		const ignoredErrorMessages = ['debugger', 'deprecation']
		return ignoredErrorMessages.some((message) => error.includes(message))
	}

	private parseOutputAsJSON(output: string): Record<string, unknown> {
		try {
			output = stripAnsi(output)
			return JSON.parse(output)
		} catch {
			throw new Error('failed parsing Salesforce CLI JSON output')
		}
	}

	public async runCommand({ command, flags, log }: CliCommand): Promise<Record<string, unknown> | string> {
		const compiledArguments = `${this.defaultPath} ${command} ${flags ? this.join(flags) : ''}`
		if (log) {
			console.info('executing Salesforce CLI command')
		}
		return new Promise<Record<string, unknown> | string>((resolve, reject) => {
			try {
				exec(compiledArguments, (error, stdout, stderr) => {
					if (error) {
						const exitCode = Number.isSafeInteger(error.code) ? ` (exit code ${error.code})` : ''
						reject(new Error(`Salesforce CLI execution failed${exitCode}`))
					} else if (stderr && !this.ignored(stderr)) {
						reject(new Error('Salesforce CLI reported an error on stderr'))
					} else if (!stdout) {
						reject(new Error('missing output from Salesforce CLI command'))
					} else {
						try {
							resolve(flags?.includes('--json') ? this.parseOutputAsJSON(stdout) : stdout)
						} catch {
							reject(new Error('failed parsing Salesforce CLI JSON output'))
						}
					}
				})
			} catch {
				reject(new Error('failed starting Salesforce CLI command'))
			}
		})
	}
}
