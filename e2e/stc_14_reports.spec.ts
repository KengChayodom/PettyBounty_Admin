import { test, expect } from './support/fixtures'
import { evidence, requireConfig, value } from './support/ui'

test.describe('STC-14 Browse and remove reports', () => {
  test('filters the visible list by status and species', async ({ page, adminConsole }) => {
    await adminConsole.reports.open()
    await adminConsole.reports.filter('Searching', 'Cat')
    await evidence(page, 'filtered-reports')
  })
  test('cancels then removes only the named disposable report', async ({ page, adminConsole }) => {
    requireConfig('UI_REMOVE_PET_ID', 'UI_REMOVE_PET_NAME')
    const name = value('UI_REMOVE_PET_NAME')
    await adminConsole.reports.detail(value('UI_REMOVE_PET_ID'), name)
    await adminConsole.reports.requestRemoval(name)
    await adminConsole.cancel()
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await adminConsole.reports.requestRemoval(name)
    await adminConsole.reports.remove()
    // Revisit the exact report: absence on a paged list alone proves nothing.
    await page.goto(`/missing-pets/${value('UI_REMOVE_PET_ID')}`)
    await expect(page.getByText(/not found|no longer exists/i)).toBeVisible()
    await expect(page.getByRole('heading', { name, exact: true })).toBeHidden()
    await evidence(page, 'removed-report-unavailable')
  })
})
