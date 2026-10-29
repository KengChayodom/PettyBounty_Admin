import { test as base, expect } from '@playwright/test'
import { AdminConsole, LoginPage } from './pages'
import { requireConfig, value } from './ui'

export const test = base.extend<{
  adminConsole: AdminConsole
  grantedRole: void
}>({
  adminConsole: async ({ page }, use) => {
    const console = new AdminConsole(page)
    await console.login.signIn()
    await expect(page.getByRole('link', { name: 'Missing pets', exact: true })).toBeVisible()
    await use(console)
  },
  // This fixture owns cleanup. No test can forget to withdraw the granted role.
  grantedRole: async ({ adminConsole, browser }, use) => {
    requireConfig('UI_ROLE_EMAIL', 'UI_ROLE_PASSWORD', 'UI_ROLE_USERNAME')
    await adminConsole.roles.open()
    await adminConsole.roles.findDisposable()
    // Arm cleanup before clicking the mutation: a UI assertion may fail after
    // the server accepted it. Cleanup must still inspect the real roster.
    try {
      await adminConsole.roles.grant()
      await expect(adminConsole.roles.row(value('UI_ROLE_USERNAME'))).toBeVisible()
      await use()
    } finally {
      await adminConsole.roles.withdrawIfGranted()
      const context = await browser.newContext()
      try {
        const page = await context.newPage()
        const login = new LoginPage(page)
        await login.signIn('ROLE')
        await login.expectRefused()
      } finally {
        await context.close()
      }
    }
  },
})
export { expect, LoginPage }
