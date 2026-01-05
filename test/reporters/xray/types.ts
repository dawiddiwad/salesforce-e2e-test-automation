type XrayStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'ABORTED'

type PlaywrightStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted'

export const XrayStatusMap: Record<PlaywrightStatus, XrayStatus> = {
	passed: 'PASSED',
	failed: 'FAILED',
	skipped: 'SKIPPED',
	timedOut: 'FAILED',
	interrupted: 'ABORTED',
}

export enum XrayEnvironmentVariables {
	clientId = 'XRAY_CLIENT_ID',
	clientSecret = 'XRAY_CLIENT_SECRET',
	projectKey = 'XRAY_PROJECT_KEY',
	testPlanKey = 'XRAY_TESTPLAN_KEY',
	stopPostingResults = 'XRAY_STOP_POSTING',
	failOnFlaky = 'XRAY_FAIL_ON_FLAKY',
	enabled = 'XRAY_ENABLED',
}

export type XrayConfig = {
	clientId: string
	clientSecret: string
	projectKey: string
	testPlanKey: string
	outputFolder: string
	outputFilename: string
}

export type XrayTestResult = {
	testExecutionKey?: string
	info: XrayInfo
	tests?: XrayTest[]
}

export type XrayInfo = {
	summary: string
	project: string
	description?: string
	version?: string
	user?: string
	revision?: string
	startDate: string
	finishDate: string
	testPlanKey: string
	testEnvironments?: object
}

export type XrayTest = {
	testKey: string
	start: string
	finish: string
	actualResult?: string
	status: string
	evidence?: XrayTestEvidence[]
	steps?: XrayTestStep[]
	defects?: object
	comment?: string
}

export type XrayTestStep = {
	status: XrayStatus
	comment?: string
	actualResult?: string
	evidences?: XrayTestEvidence[]
}

export type XrayTestEvidence = {
	data: string
	filename: string
	contentType: string
}

export type XrayToken = {
	Authorization: string
}
