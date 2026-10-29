import { test, expect, LoginPage } from './support/fixtures'

test.describe('STC-23 Administrator roles', () => {
  test('offers no self-withdraw control', async ({ page, adminConsole }) => {
    await adminConsole.roles.open()
    const self = page.getByRole('listitem').filter({ has: page.getByText('You', { exact: true }) })
    await expect(self).toBeVisible()
    await expect(self.getByRole('button', { name: 'Withdraw', exact: true })).toBeHidden()
  })
  test('grants console access for a disposable account and restores its role', async ({
    browser,
    grantedRole,
  }) => {
    void grantedRole
    const context = await browser.newContext()
    try {
      const other = await context.newPage()
      await new LoginPage(other).signIn('ROLE')
      await expect(other.getByRole('link', { name: 'Missing pets', exact: true })).toBeVisible()
    } finally {
      await context.close()
    }
    // Withdrawal is performed and checked by the grantedRole fixture teardown.
  })
})
