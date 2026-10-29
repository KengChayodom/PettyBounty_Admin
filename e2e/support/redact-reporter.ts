import type { Reporter, TestCase, TestError, TestResult, TestStep } from '@playwright/test/reporter'

// Keep this reporter FIRST: built-in HTML reports also record fill() step titles.
// Disabling traces alone does not keep typed credentials out of those reports.
export default class RedactReporter implements Reporter {
  private secrets = Object.entries(process.env)
    .filter(([key, value]) => /^UI_.*_(EMAIL|PASSWORD)$/.test(key) && value)
    .flatMap(([, value]) => [value!, JSON.stringify(value).slice(1, -1)])
    .sort((a, b) => b.length - a.length)

  private clean(text: string | undefined) {
    if (text === undefined) return undefined
    for (const secret of this.secrets) text = text.split(secret).join('[redacted]')
    return text
  }
  private error(error: TestError | undefined) {
    if (!error) return
    error.message = this.clean(error.message)
    error.stack = this.clean(error.stack)
    error.value = this.clean(error.value)
    error.snippet = this.clean(error.snippet)
  }
  private step(step: TestStep) {
    step.title = this.clean(step.title)!
    this.error(step.error)
    for (const child of step.steps) this.step(child)
  }
  onStepBegin(_test: TestCase, _result: TestResult, step: TestStep) {
    this.step(step)
  }
  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep) {
    this.step(step)
  }
  onTestEnd(_test: TestCase, result: TestResult) {
    this.error(result.error)
    for (const error of result.errors) this.error(error)
    for (const step of result.steps) this.step(step)
  }
  onError(error: TestError) {
    this.error(error)
  }
}
