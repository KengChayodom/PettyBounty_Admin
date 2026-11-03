import { test, expect, LoginPage } from './support/fixtures'
import { evidence, requireConfig, value } from './support/ui'

test.describe('STC-13 Administrator timeline', () => {
  test('reads a prepared report and its named hunter in the full timeline', async ({
    page,
    adminConsole,
  }) => {
    requireConfig('UI_TIMELINE_PET_ID', 'UI_TIMELINE_PET_NAME', 'UI_TIMELINE_HUNTER')
    await adminConsole.reports.detail(value('UI_TIMELINE_PET_ID'), value('UI_TIMELINE_PET_NAME'))
    const timeline = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Sighting timeline', exact: true }) })
    await expect(timeline.getByText(value('UI_TIMELINE_HUNTER'), { exact: false })).toBeVisible()
    await expect(timeline.getByRole('listitem').first()).toBeVisible()
    await evidence(page, 'report-timeline')
  })
  test('refuses an ordinary account at console sign in', async ({ page }) => {
    const login = new LoginPage(page)
    await login.signIn('USER')
    await login.expectRefused()
  })
})
