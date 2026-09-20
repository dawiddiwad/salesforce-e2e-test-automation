import { exec } from 'child_process'
import stripAnsi from 'strip-ansi'
import { diagnostic, secrets } from '../errors/redaction'

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

	/**
	 * `sf <command> --json` output carries the org access token, and a `JSON.parse` failure
	 * echoes the input it choked on — including a prefix of that token, which literal
	 * redaction cannot match. The cause therefore describes the shape of the output rather
	 * than any of its content.
	 */
	private parseOutputAsJSON(output: string): Record<string, unknown> {
		const cleaned = stripAnsi(output)
		try {
			return JSON.parse(cleaned)
		} catch (error) {
			const leadingCharacter = JSON.stringify(cleaned.slice(0, 1))
			const parserName = error instanceof Error ? error.name : 'unknown error'
			throw diagnostic(
				'failed parsing Salesforce CLI JSON output',
				new Error(
					`${parserName}: expected JSON, received ${cleaned.length} characters beginning with ${leadingCharacter}`
				)
			)
		}
	}

	/**
	 * Salesforce CLI reports the actionable part of a failure on stderr — `No authorization
	 * information found`, `This org appears to have a problem with its OAuth configuration`.
	 * It is retained as a redacted cause: the CLI also echoes auth urls and tokens there,
	 * which {@link secrets} masks.
	 */
	private stderrCause(stderr: string): Error {
		return new Error(secrets.redact(stripAnsi(stderr).trim()))
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
						reject(
							diagnostic(
								`Salesforce CLI execution failed${exitCode}`,
								stderr ? this.stderrCause(stderr) : error
							)
						)
					} else if (stderr && !this.ignored(stderr)) {
						reject(diagnostic('Salesforce CLI reported an error on stderr', this.stderrCause(stderr)))
					} else if (!stdout) {
						reject(new Error('missing output from Salesforce CLI command'))
					} else {
						try {
							resolve(flags?.includes('--json') ? this.parseOutputAsJSON(stdout) : stdout)
						} catch (error) {
							reject(diagnostic('failed parsing Salesforce CLI JSON output', error))
						}
					}
				})
			} catch (error) {
				reject(diagnostic('failed starting Salesforce CLI command', error))
			}
		})
	}
}
