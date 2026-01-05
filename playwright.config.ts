import { defineConfig } from '@playwright/test'
import { config as envConfig } from 'dotenv'

envConfig({ quiet: true })

export default defineConfig({
	projects: [
		{
			name: 'demo',
			testDir: './test/specs/demo',
		},
		{
			name: 'setup',
			testDir: './test/specs/setup',
		},
		{
			name: 'regression',
			dependencies: ['setup'],
			testDir: './test/specs/regression',
		},
		{
			name: 'email',
			testDir: './test/specs/email',
		},
		{
			name: 'specific-project',
			dependencies: ['setup'],
			testDir: './test/specs/specific-project',
		},
	],
	outputDir: process.env.CI ? undefined : './test-reports/results',
	reporter: [
		['./test/reporters/xray/xray-reporter.ts', { outputFolder: './test-reports/xray' }],
		['junit', { outputFile: './test-reports/junit/results.xml' }],
		['html', { outputFolder: './test-reports/html' }],
		['list'],
	],
	timeout: 15 * 60000,
	repeatEach: 1,
	retries: 1,
	workers: process.env.CI ? '100%' : '50%',
	updateSnapshots: 'none',
	snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/[snapshot] {testFileName}{testName}{ext}',
	expect: {
		timeout: 1 * 60000,
	},
	use: {
		channel: 'chromium',
		actionTimeout: 1 * 60000,
		navigationTimeout: 1 * 60000,
		headless: true,
		ignoreHTTPSErrors: true,
		screenshot: 'only-on-failure',
		video: {
			mode: process.env.CI ? 'off' : 'retain-on-failure',
			size: { width: 1366, height: 768 },
		},
		trace: process.env.CI ? 'off' : 'retain-on-failure',
		viewport: { width: 1366, height: 768 },
	},
})
