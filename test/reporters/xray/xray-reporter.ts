import { FullResult, Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter'
import {
	XrayStatusMap,
	XrayConfig,
	XrayInfo,
	XrayTest,
	XrayTestEvidence,
	XrayTestResult,
	XrayTestStep,
	XrayToken,
	XrayEnvironmentVariables as Xray,
} from './types'
import * as fs from 'fs/promises'
import { APIRequestContext, chromium } from '@playwright/test'
import stripAnsi from 'strip-ansi'

export default class XrayReporter implements Reporter {
	protected readonly urlInstance = 'https://xray.cloud.getxray.app'
	protected readonly pathAuthenticate = '/api/v2/authenticate'
	protected readonly pathImportExecution = '/api/v2/import/execution'
	protected tests: XrayTest[] = []
	protected testInfo: XrayInfo = {} as XrayInfo
	protected fullTestResult: XrayTestResult = {} as XrayTestResult
	protected bearerToken: XrayToken = {} as XrayToken
	protected options: XrayConfig = {} as XrayConfig
	protected request: Promise<APIRequestContext> = {} as Promise<APIRequestContext>

	constructor(config: { outputFolder: string; outputFilename?: string }) {
		if (!process.env[Xray.enabled] || process.env[Xray.enabled] !== 'true') return

		if (!config.outputFolder)
			throw new Error(`⛔ missing Xray Reporter config
            \nmake sure to setup outputFolder in Playwright config file for Xray Reporter\n`)

		if (
			!process.env[Xray.clientId] ||
			!process.env[Xray.clientSecret] ||
			!process.env[Xray.projectKey] ||
			!process.env[Xray.testPlanKey]
		)
			throw new Error(`⛔ missing Xray Reporter config
            \nmake sure that ${Xray.clientId}, ${Xray.clientSecret}, ${Xray.projectKey}, ${Xray.testPlanKey} environment variables are set\n`)

		this.options = {
			outputFolder: config.outputFolder,
			outputFilename: config.outputFilename ?? 'xray-full-result.json',
			projectKey: process.env[Xray.projectKey],
			testPlanKey: process.env[Xray.testPlanKey],
			clientId: process.env[Xray.clientId],
			clientSecret: process.env[Xray.clientSecret],
		}

		this.request = chromium
			.launch()
			.then((chrome) => chrome.newContext())
			.then((context) => context.request)
			.catch((error) => {
				throw new Error(`⛔ unable to create API request context for Xray Reporter due to\n${error}`)
			})
	}

	private getTestErrors(result: TestResult): string[] | undefined {
		const errors: string[] = []
		if (XrayStatusMap[result.status] === 'FAILED') {
			result.errors.map((error) => {
				if (error.message) {
					errors.push(this.formatError(error.message))
				}
			})
		}
		return errors.length ? errors : undefined
	}

	private getStepErrors(step: TestStep): string[] | undefined {
		const errors: Set<string> = new Set()
		if (step.error && step.error.message) {
			errors.add(this.formatError(step.error.message))
		}
		if (step.duration === -1 || step.error) {
			for (const child of step.steps) {
				const childErrors = this.getStepErrors(child)
				childErrors?.forEach((childError) => errors.add(childError))
			}
		}
		return errors.size ? [...errors] : undefined
	}

	private getSteps(result: TestResult): XrayTestStep[] | undefined {
		const actualResultsCharLimit = 8000
		const steps: XrayTestStep[] = []

		result.steps.map((step) => {
			if (!step.parent && step.category === 'test.step') {
				const errors = this.getStepErrors(step)
				const status = errors ? XrayStatusMap['failed'] : XrayStatusMap['passed']
				const actions: string[] = []
				const evidences: XrayTestEvidence[] = []

				step.steps.forEach((action) => actions.push(action.title))
				if (errors) {
					actions.push(errors.join('\n'))
				}

				const joinedActions = actions.join('\n')
				if (joinedActions.length > actualResultsCharLimit) {
					evidences.push({
						data: Buffer.from(joinedActions, 'utf-8').toString('base64'),
						filename: 'actions.txt',
						contentType: 'text/plain',
					})
				}

				steps.push({
					status: status,
					actualResult:
						joinedActions && joinedActions.length < actualResultsCharLimit
							? joinedActions
							: 'action list was too long to fit in here 😓 see actions.txt in Evidence',
					evidences: evidences.length ? evidences : undefined,
				})
			}
		})
		return steps.length ? steps : undefined
	}

	private async getEvidence(result: TestResult): Promise<XrayTestEvidence[] | undefined> {
		const evidences: XrayTestEvidence[] = []
		for (const file of result.attachments) {
			if (file.body && file.path) {
				evidences.push({
					data: file.body.toString('base64'),
					filename: `${file.name}${this.getFileExtension(file.path)}`,
					contentType: file.contentType,
				})
			} else if (file.path) {
				evidences.push({
					data: await fs.readFile(file.path).then((file) => file.toString('base64')),
					filename: `${file.name}${this.getFileExtension(file.path)}`,
					contentType: file.contentType,
				})
			}
		}
		return evidences.length ? evidences : undefined
	}

	private getFileExtension(filePath: string): string {
		const fileExtension = filePath.match(/\.[^/.]+$/)?.[0]
		if (!fileExtension) throw new Error(`⛔ unable to parse file extension from ${filePath}`)
		else return fileExtension
	}

	private stripAnsiColoring(error: string): string {
		const errorMessage = stripAnsi(error.valueOf())
		return errorMessage ? errorMessage : ''
	}

	private formatError(message: string): string {
		message = this.stripAnsiColoring(message)
		message = `
        🔥 --- ERROR --- 🔥
        ${message}

        `
		return message
	}

	private stringify(json: Record<string, any>): string {
		return JSON.stringify(json, null, 3)
	}

	protected async authenticate(): Promise<XrayToken> {
		const request = await this.request
		const url = new URL(`${this.urlInstance}${this.pathAuthenticate}`).toString()
		const secrets = {
			client_id: this.options.clientId,
			client_secret: this.options.clientSecret,
		}

		const response = await request.post(url, { data: secrets })
		const body = await response
			.body()
			.then((body) => body.toString())
			.catch((error) => error)

		if (response.ok()) return (this.bearerToken = { Authorization: `Bearer ${body.replaceAll('"', '')}` })
		else throw Error(`⛔ authorizing Xray due to\n${body}`)
	}

	protected async postFullResult() {
		const request = await this.request
		const results = this.fullTestResult
		const url = new URL(`${this.urlInstance}${this.pathImportExecution}`).toString()

		console.info(`👉 start posting results to Xray for Test Plan ${this.options.testPlanKey} ... ⏳`)
		const response = await request.post(url, { data: results, headers: this.bearerToken })
		const body = await response
			.body()
			.then((body) => body.toString())
			.catch((error) => error)

		if (response.ok()) return console.info(`👉 success posting results to Xray 🚀`)
		else throw new Error(`⛔ posting Xray results due to\n${body}`)
	}

	async onTestEnd(test: TestCase, result: TestResult) {
		if (!process.env[Xray.enabled] || process.env[Xray.enabled] !== 'true') return

		const testKey = test.tags.find((tag) => tag.includes(this.options.projectKey))
		if (!testKey) return

		const xrayTest: XrayTest = {
			testKey: testKey.replaceAll('@', ''),
			start: result.startTime.toISOString(),
			finish: new Date().toISOString(),
			status: XrayStatusMap[result.status],
			comment: this.getTestErrors(result)?.join('\n'),
			steps: this.getSteps(result),
			evidence: await this.getEvidence(result),
		}

		this.tests = this.tests ?? []
		if (process.env[Xray.failOnFlaky]) this.tests.push(xrayTest)
		else this.tests.unshift(xrayTest)
	}

	async onEnd(result: FullResult): Promise<void> {
		if (!process.env[Xray.enabled] || process.env[Xray.enabled] !== 'true') return

		if (!this.tests) return

		const finishDate = new Date().toISOString()
		this.testInfo = {
			summary: `Automated Run [${finishDate}]`,
			project: this.options.projectKey,
			startDate: result.startTime.toISOString(),
			finishDate: finishDate,
			testPlanKey: this.options.testPlanKey,
		}

		this.fullTestResult = {
			info: this.testInfo,
			tests: this.tests,
		}
	}

	async onExit(): Promise<void> {
		if (!process.env[Xray.enabled] || process.env[Xray.enabled] !== 'true') return

		if (!this.tests)
			return console.warn(
				`⚠️ no tests tagged with Jira project key @${this.options.projectKey} - ${this.options.outputFilename} report will not be created and posted to Xray`
			)
		else
			try {
				await fs.mkdir(this.options.outputFolder, { recursive: true })
				await fs.writeFile(
					`${this.options.outputFolder}/${this.options.outputFilename}`,
					`${this.stringify(this.fullTestResult)}`
				)
			} catch (error: any) {
				return console.error(
					`⛔ unable to save Xray ${this.options.outputFilename} report due to\n${this.stringify(error)}`
				)
			}

		if (process.env[Xray.stopPostingResults])
			return console.info(
				`👉 ${Xray.stopPostingResults} environment variable is set - results will not be posted to Xray`
			)
		else
			try {
				await this.authenticate()
				await this.postFullResult()
			} catch (error) {
				console.error(`⛔ unable to upload Xray report due to\n${error}`)
			}
	}
}
