# Developer Guide

> Quick reference handbook for extending and maintaining the Salesforce E2E test automation framework.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Concepts](#core-concepts)
4. [Creating Tests](#creating-tests)
5. [Page Object Model](#page-object-model)
6. [Service Object Model](#service-object-model)
7. [Test Fixtures](#test-fixtures)
8. [Test Data & Policies](#test-data--policies)
9. [Custom Reporter (Xray)](#custom-reporter-xray)
10. [Conventions & Best Practices](#conventions--best-practices)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Test Specs (.spec.ts)                      │
│             test/specs/{project}/{feature}.spec.ts              │
├─────────────────────────────────────────────────────────────────┤
│                Test Runner (custom-test-runner.ts)              │
│              Merges fixtures: ui, api, actor, email             │
├────────────────────────┬────────────────────────────────────────┤
│    Page Object Model   │         Service Object Model           │
│   (UI Interactions)    │        (API Interactions)              │
│   test/models/pages.ts │       test/models/services.ts          │
├────────────────────────┴────────────────────────────────────────┤
│                    Base Abstractions (src/)                     │
│     SalesforcePage | SalesforceService | RestApiHandler         │
├─────────────────────────────────────────────────────────────────┤
│                    Authentication Layer                         │
│     SalesforceCliAuthenticator → DefaultSalesforceCliUser       │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**

- **Playwright** - Browser automation & test runner
- **TypeScript** - Type-safe development
- **jsforce** - Salesforce API client
- **faker.js** - Test data generation

---

## Project Structure

```
root/
├── src/                          # Framework core (reusable)
│   ├── api/                      # API handlers
│   │   ├── email/                # Email API
│   │   └── salesforce/           # SF REST API (RestApiHandler)
│   ├── authorization/            # Auth strategies
│   ├── cli/                      # Salesforce CLI wrapper
│   ├── models/                   # Base abstractions
│   │   ├── pages/                # SalesforcePage base class
│   │   ├── services/             # SalesforceService base class
│   │   └── types.ts              # Core types
│   └── users/                    # User context management
│
├── test/                         # Specific Test Context implementation
│   ├── models/                   # Page & Service implementations
│   │   ├── pages.ts              # UI catalog (allSalesforcePages)
│   │   ├── services.ts           # API catalog (allSalesforceServices)
│   │   ├── {domain}/             # Domain-specific models
│   │   │   ├── pages/            # Page objects
│   │   │   ├── services/         # Service objects
│   │   │   └── types/            # Domain types
│   ├── policies/                 # Data policies & naming conventions
│   ├── reporters/                # Custom reporters (Xray)
│   ├── runners/                  # Test fixtures (custom-test-runner.ts)
│   ├── specs/                    # E2E test specifications
│   │   └── {project}/            # Test suites by project
│   │       ├── {feature}.spec.ts # Test files
│   │       └── support/          # Test data & helpers
│   └── unit/                     # Offline framework mechanics tests
│
└── playwright.config.ts          # Playwright configuration
```

`test/unit/` focuses on reusable mechanics in `src/`: API and CLI handlers, authentication, record helpers, and base error propagation. It also covers the shared `@step` decorator and Xray HTTP boundary. Domain page/service behavior and business scenarios belong in `test/specs/`, rather than being duplicated with unit-level model mocks.

---

## Core Concepts

### Authentication Flow

The framework uses Salesforce CLI for authentication - no credentials stored in code:

```
┌──────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│  Salesforce CLI  │───▶│ SalesforceCliAuth   │───▶│ DefaultSFCliUser │
│  (sf org display)│    │   (extracts token)  │    │  (ui + api ready)│
└──────────────────┘    └─────────────────────┘    └──────────────────┘
```

- **UI Auth**: Session cookie (`sid`) injected into browser context
- **API Auth**: Access token passed to jsforce `Connection`

### The `@step` Decorator

All public methods in pages/services should use `@step` for automatic Playwright reporting:

```typescript
import { step } from '../../../test/runners/custom-test-runner'

export class MyPage extends SalesforcePage {
	@step
	async doSomething(param: string) {
		// This appears in Playwright report as:
		// "MyPage > Do Something"
	}
}
```

The decorator auto-formats class and method names into readable steps. Arguments are deliberately omitted: they may contain credentials, personal data or raw Apex. It also enables **boxed steps** in traces for cleaner debugging. Do not add raw request payloads or credential-bearing error responses to step titles or logs. Authentication, Salesforce API, CLI, IMAP and Xray HTTP failures intentionally omit raw upstream diagnostics and causes; Apex failures retain only compilation status and numeric source locations. Non-sensitive UI and service wrappers preserve the original error through `Error.cause`. Investigate detailed server errors in an appropriately secured environment instead of publishing them in test artifacts.

### Fluent Interface Pattern

The framework organizes pages and services into a nested, discoverable API:

```typescript
// UI interactions - mirrors Salesforce navigation hierarchy
await ui.navigator.openApp('Travel Sales')
await ui.itinerary.record.details.openTab('Builder')
await ui.itinerary.builder.getLine(1).then(line => line.setService({...}))

// API interactions - mirrors Salesforce object model
await api.account.record.createNewPerson({...})
await api.itinerary.record.getPriceLines(itineraryId)
```

**Why this matters**: IDE autocomplete guides you through available actions. No need to memorize class names.

### Async Initialization (`ready` Pattern)

Classes requiring async setup expose a `ready` promise:

```typescript
// Class definition
class MyHandler {
	ready: Promise<this>

	constructor() {
		this.ready = this.initialize().then(() => this)
	}
}

// Usage - always await .ready before using
const handler = await new MyHandler().ready
```

Used by: `RestApiHandler`, `DefaultSalesforceCliUser`, `SalesforceCliAuthenticator`

### Locator Organization

Page objects group locators by element type for maintainability:

```typescript
export class MyPage extends SalesforcePage {
	private readonly button = {
		save: this.page.getByRole('button', { name: 'Save' }),
		cancel: this.page.getByRole('button', { name: 'Cancel' }),
	}

	private readonly input = {
		name: this.page.getByLabel('Name'),
		email: this.page.getByPlaceholder('Email'),
	}

	private readonly modal = {
		confirm: this.page.getByRole('dialog'),
		closeButton: this.page.getByRole('dialog').getByRole('button', { name: 'Close' }),
	}
}
```

---

## Creating Tests

### 1. Basic Test Structure

```typescript
import { expect } from '@playwright/test'
import { test } from '../../runners/custom-test-runner'
import { testData } from './support/test-data'

test.describe('feature e2e', () => {
	test.beforeEach(async ({ ui }) => {
		await ui.navigator.openApp('Travel Sales')
	})

	test.afterEach(async ({ ui }) => {
		// Cleanup logic
	})

	test('test case name', { tag: ['@TA-12345', '@regression'] }, async ({ api, ui }) => {
		await test.step('step description', async () => {
			// Step implementation
		})
	})
})
```

### 2. Available Fixtures

| Fixture | Type                       | Description                             |
| ------- | -------------------------- | --------------------------------------- |
| `ui`    | `SalesforcePages`          | Page object catalog for UI interactions |
| `api`   | `SalesforceServices`       | Service catalog for API interactions    |
| `actor` | `DefaultSalesforceCliUser` | Raw access to page/api (advanced)       |
| `email` | `EmailServices`            | Email service operations                |

### 3. Test Tagging

```typescript
test('test name', { tag: ['@TA-12345', '@regression'] }, async () => {})
```

- `@TA-XXXXX` - Xray/Jira ticket reference (required for Xray reporting)
- `@regression`, `@smoke`, `@sp` - Test categorization

### 4. Using Test Steps

Always wrap logical operations in `test.step()`:

```typescript
await test.step('create person account', async () => {
	await api.account.record.createNewPerson({
		FirstName: 'John',
		LastName: 'Doe',
	})
})
```

---

## Page Object Model

### Creating a New Page Object

**Location:** `test/models/{domain}/pages/{feature}-page.ts`

```typescript
import { expect } from '@playwright/test'
import { SalesforcePage } from '../../../../src/models/pages/salesforce-page'
import { step } from '../../../runners/custom-test-runner'

export class MyFeaturePage extends SalesforcePage {
	// 1. Define locators as private readonly properties
	private readonly button = {
		save: this.page.getByRole('button', { name: 'Save' }),
		cancel: this.page.getByRole('button', { name: 'Cancel' }),
	}

	private readonly input = {
		name: this.page.getByLabel('Name'),
		email: this.page.getByPlaceholder('Enter email'),
	}

	private readonly table = {
		row: this.page.locator('table tbody tr'),
	}

	// 2. Implement actions with @step decorator
	@step
	async fillForm(name: string, email: string) {
		await this.input.name.fill(name)
		await this.input.email.fill(email)
	}

	@step
	async save() {
		await this.button.save.click()
		await this.waitForSpinners()
		await expect(this.toast.alert()).toContainText('saved')
	}

	@step
	async getRowCount(): Promise<number> {
		return (await this.table.row.all()).length
	}
}
```

### Registering the Page Object

Add to `test/models/pages.ts`:

```typescript
import { MyFeaturePage } from './domain/pages/my-feature-page'

export const allSalesforcePages = (page: Page) =>
	({
		// ... existing pages
		myFeature: new MyFeaturePage(page),
	}) satisfies FluentInterface<SalesforcePage>
```

### Base Class Utilities (SalesforcePage)

| Method                               | Description                |
| ------------------------------------ | -------------------------- |
| `this.page`                          | Playwright Page instance   |
| `this.toast.alert()`                 | Toast notification locator |
| `this.waitForSpinners()`             | Wait for loading spinners  |
| `this.waitForOptionalSpinners()`     | Non-blocking spinner wait  |
| `this.getToastAlerts()`              | Get all toast messages     |
| `this.getSalesforceIdFromUrl()`      | Extract SF ID from URL     |
| `this.getOriginUrl()`                | Get base URL               |
| `this.salesforcePerformanceBeacon()` | Wait for SF beacon         |

---

## Service Object Model

### Creating a New Service

**Location:** `test/models/{domain}/services/{feature}-service.ts`

```typescript
import { Record } from 'jsforce'
import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { step } from '../../../runners/custom-test-runner'

export class MyFeatureService extends SalesforceService {
	@step
	async create(data: MyRecordType): Promise<string> {
		const result = await this.api.create('CustomObject__c', data)
		return result.id
	}

	@step
	async findByName(name: string): Promise<Record> {
		const result = await this.api.query(`SELECT Id, Name FROM CustomObject__c WHERE Name = '${name}'`)
		return result.records[0] as Record
	}

	@step
	async update(id: string, data: Partial<MyRecordType>) {
		await this.api.update('CustomObject__c', { Id: id, ...data })
	}

	@step
	async delete(id: string) {
		await this.api.delete('CustomObject__c', id)
	}
}
```

### Registering the Service

Add to `test/models/services.ts`:

```typescript
import { MyFeatureService } from './domain/services/my-feature-service'

export const allSalesforceServices = (api: RestApiHandler) =>
	({
		// ... existing services
		myFeature: new MyFeatureService(api),
	}) satisfies FluentInterface<SalesforceService>
```

### RestApiHandler Methods

| Method        | Signature                   | Description        |
| ------------- | --------------------------- | ------------------ |
| `create`      | `create(sObject, data)`     | Create record      |
| `read`        | `read(sObject, id)`         | Read record by ID  |
| `update`      | `update(sObject, data)`     | Update record      |
| `delete`      | `delete(sObject, id)`       | Delete record      |
| `query`       | `query(soql, acceptEmpty?)` | Execute SOQL       |
| `executeApex` | `executeApex(apex)`         | Run anonymous Apex |

---

## Test Fixtures

### Custom Fixture Definition

The test runner (`test/runners/custom-test-runner.ts`) merges multiple fixtures:

```typescript
import { mergeTests, test as base } from '@playwright/test'

// UI Fixture - provides ui.* methods
const testSalesforceUiCatalog = base.extend<SalesforcePageObjectModel<SalesforcePages>>({
	ui: async ({ page }, use) => {
		const actor = await new DefaultSalesforceCliUser().ready.then((user) => user.setUi(page))
		return use({ ...allSalesforcePages(actor.ui) })
	},
})

// API Fixture - provides api.* methods
const testSalesforceApiCatalog = base.extend<SalesforceServiceObjectModel<SalesforceServices>>({
	api: async ({}, use) => {
		const actor = await new DefaultSalesforceCliUser().ready.then((user) => user.setApi('default'))
		return use({ ...allSalesforceServices(actor.api) })
	},
})

// Merged export
export const test = mergeTests(
	testSalesforceUiCatalog,
	testSalesforceApiCatalog,
	testSalesforceDefaultActor,
	testEmailApiCatalog
)
```

### Using Raw Actor

For advanced scenarios requiring direct API access:

```typescript
test('advanced test', async ({ actor }) => {
	// Direct jsforce query
	const result = await actor.api.query('SELECT Id FROM Account LIMIT 1')

	// Direct page navigation
	await actor.ui.goto('/path')
})
```

---

## Test Data & Policies

### Creating Test Data

**Location:** `test/specs/{project}/support/test-data.ts`

```typescript
import { faker } from '@faker-js/faker'
import { NamingPolicy } from '../../../policies/naming-policy'

export const testData = {
	trip: {
		name: `QA Test Trip ${NamingPolicy.randomId()}`,
		channel: 'Default Channel',
	},
	account: {
		name: () => `${testData.account.firstName} ${testData.account.lastName}`,
		firstName: `QA ${NamingPolicy.randomId()}`,
		lastName: `Test ${NamingPolicy.randomId()}`,
	},
	randomEmail: () => faker.internet.email(),
	randomPhone: () => faker.phone.number({ style: 'international' }),
}
```

### Naming Policy

```typescript
// test/policies/general.ts
export class GeneralNamingPolicy {
	static randomId = () => faker.string.alpha({ length: 3, casing: 'mixed' })
	static uniqueName = () => `${faker.person.lastName()}-${NamingPolicy.randomId()}`
}
```

### Project-Specific Policy

```typescript
// test/policies/specific-project.ts
export class SpecificProjectNamingPolicy {
	static naming = {
		prefix: 'qa', // Helps identify test data for cleanup
	}
	static email = {
		unique: () => `qa-sandbox-testing+${faker.string.uuid()}@example-company.com`,
	}
}
```

---

## Custom Reporter (Xray)

### Configuration

Enable via `.env`:

```bash
XRAY_ENABLE=true
XRAY_PROJECT_KEY=TA
XRAY_TESTPLAN_KEY=TA-11848
XRAY_CLIENT_ID=your_client_id
XRAY_CLIENT_SECRET=your_client_secret
# Optional: XRAY_STOP_POSTING=true (generate JSON only)
```

### Tagging Tests for Xray

```typescript
// Tag MUST match XRAY_PROJECT_KEY pattern
test('test name', { tag: ['@TA-12345'] }, async () => {
	await test.step('step 1', async () => {
		/* ... */
	})
	await test.step('step 2', async () => {
		/* ... */
	})
})
```

Each `test.step()` maps to an Xray test step.

---

## Conventions & Best Practices

### ✅ DO

```typescript
// Use descriptive step names
await test.step('create person account with required fields', async () => {})

// Use object destructuring for locators
private readonly button = {
    save: this.page.getByRole('button', { name: 'Save' })
}

// Chain page object methods fluently
await ui.itinerary.record.details.openTab('Builder')
await ui.itinerary.builder.addLine()

// Handle cleanup in afterEach
test.afterEach(async ({ api }) => {
    for (const id of createdRecords) {
        await api.record.delete(id)
    }
})

// Use policies for naming
const name = `${MyPolicy.prefix} ${NamingPolicy.randomId()}`

// Prefer role-based locators
this.page.getByRole('button', { name: 'Save' })
this.page.getByLabel('Email')
```

### ❌ DON'T

```typescript
// Don't use raw CSS selectors when roles are available
this.page.locator('.btn-save')  // ❌
this.page.getByRole('button', { name: 'Save' })  // ✅

// Don't skip @step decorator on public methods
async myMethod() { /* ... */ }  // ❌
@step async myMethod() { /* ... */ }  // ✅

// Don't hardcode test data
const email = 'test@example.com'  // ❌
const email = faker.internet.email()  // ✅

// Don't forget cleanup
test('creates record', async () => { /* no cleanup */ })  // ❌
```

### File Naming

| Type         | Pattern                | Example                  |
| ------------ | ---------------------- | ------------------------ |
| Spec files   | `{feature}.spec.ts`    | `itinerary-e2e.spec.ts`  |
| Page objects | `{feature}-page.ts`    | `record-details-page.ts` |
| Services     | `{feature}-service.ts` | `record-service.ts`      |
| Types        | `{domain}.ts`          | `account.ts`             |

### Directory Structure for New Domain

```
test/models/{new-domain}/
├── pages/
│   └── my-page.ts
├── services/
│   └── my-service.ts
└── types/
    └── my-types.ts
```

---

## Dependency Compatibility

- TypeScript is kept on `~6.0.3`: `typescript-eslint` 8.70.0 supports TypeScript below 6.1, not the latest TypeScript 7 release.
- `@types/node` stays on the latest 24.x release to match the runtime, rather than exposing Node 26 APIs.
- ESLint 10's `preserve-caught-error` rule is enabled. Non-sensitive wrappers retain `{ cause: error }`. Authentication and credential-bearing boundaries use deliberate parameterless catches and safe messages, without retaining raw errors or response bodies; the rule's default `requireCatchParameter: false` permits this.
- The `utf7` dependency used by IMAP pins vulnerable `semver` 5.3 internally. The scoped override selects patched `semver` 5.7.2 without changing its major version.
- The latest JSforce 3.10.25 still depends on `csv-parse` 5.x. `npm audit` reports two moderate entries for this chain. Do not apply its proposed downgrade to JSforce 1.6.5 or force a CSV parser major override without integration testing.

## Quick Commands

Use Node.js **24.20.0 LTS** (`nvm install` and `nvm use` use the repository's `.nvmrc`). CI uses the same Node version and installs the browser revision selected by the locked Playwright dependency.

Framework unit tests use Node's test runner through `tsx`; they require no Salesforce org, browser, email or Xray credentials:

```bash
npm run test:unit
npm run validation:check
```

The amendment comparator requires equal collection sizes and unambiguous, one-to-one matching keys. It fails immediately on a mismatch. Fetching children of a missing parent fails rather than treating that parent as an empty collection. Field filters exclude volatile fields; `select` filters compare only explicitly selected fields. Nested `count()` relationships intentionally check counts only. Compare the pre-merge amendment as expected against the merged primary as actual.

Storage cleanup waits for all attempted deletions and fails with an aggregate error if any object fails. It still deletes recent records by object/date rather than test ownership; enable it only in a disposable test org.

```bash
# Run specific test by tag
npx playwright test --grep=@TA-12345

# Run project suite
npx playwright test --project=regression

# Run with UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Show report
npx playwright show-report ./test-reports/html
```

---

## Adding a New Test (Checklist)

1. [ ] Create test data in `support/test-data.ts`
2. [ ] Create/reuse page objects in `test/models/*/pages/`
3. [ ] Create/reuse services in `test/models/*/services/`
4. [ ] Register new pages/services in catalogs
5. [ ] Write spec with proper tags (`@TA-XXXXX`)
6. [ ] Wrap logic in `test.step()`
7. [ ] Add cleanup in `afterEach`
8. [ ] Run and verify Xray integration

---
