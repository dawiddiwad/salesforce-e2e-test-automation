import { test } from '@playwright/test'
import { secrets } from '../errors/redaction'

/**
 * Reports the decorated method as a boxed Playwright step.
 *
 * **Title format**
 *
 * `ClassName > Method Name : arg1, arg2` — arguments are included, because knowing that a run
 * failed on `Open Tab : Builder` rather than just `Open Tab` is most of the value of a step in
 * a report. Arrays render as `[a, b]`, objects as pretty JSON, `undefined` as `any`.
 *
 * Titles are passed through {@link secrets}, so credentials the framework has registered are
 * masked. Unregistered values are shown verbatim: a method whose arguments are genuinely
 * sensitive, or too large to read in a report, is better left undecorated.
 *
 * **Layering**
 *
 * This lives in `src/` rather than `test/runners/` so that framework code can be reported
 * without importing the project-specific fixture catalog. `test.step` from `@playwright/test`
 * resolves against the currently running test, so the merged `test` object in
 * `test/runners/custom-test-runner.ts` reports through this decorator unchanged.
 */
export function step<This, Args extends unknown[], Return>(
	target: (this: This, ...args: Args) => Return,
	context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) {
	return function (this: This, ...args: Args): Return {
		const formatMethodName = (name: string) =>
			name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^([a-z])/, (match) => match.toUpperCase())

		const formatMethodArgument = (arg: unknown): string => {
			if (arg === undefined) return 'any'
			if (Array.isArray(arg)) return `[${arg.join(', ')}]`
			if (typeof arg === 'object' && arg !== null) {
				try {
					return JSON.stringify(arg, null, 2) ?? String(arg)
					// eslint-disable-next-line no-restricted-syntax -- a cyclic or unserializable argument must degrade to its string form, never fail the step it is describing
				} catch {
					return String(arg)
				}
			}
			return String(arg)
		}

		const methodName = formatMethodName(String(context.name))
		const formattedArguments = args.length ? ` : ${args.map(formatMethodArgument).join(', ')}` : ''
		const className = (this as object).constructor.name
		const stepName = secrets.redact(`${className} > ${methodName}${formattedArguments}`)

		return test.step(stepName, async () => target.call(this, ...args), { box: true }) as Return
	}
}
