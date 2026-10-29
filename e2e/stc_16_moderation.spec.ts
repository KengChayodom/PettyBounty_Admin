import { test, expect } from './support/fixtures'
import { disposable, evidence, requireConfig, value } from './support/ui'

test.describe('STC-16 Moderation', () => {
  test('cancels then upholds one disposable flag with ten points', async ({
    page,
    adminConsole,
  }) => {
    requireConfig('UI_FLAG_ID', 'UI_FLAG_SIGHTING_ID', 'UI_FLAG_HUNTER', 'UI_FLAG_HUNTER_ID')
    disposable(value('UI_FLAG_HUNTER'))
    const args = [
      value('UI_FLAG_ID'),
      value('UI_FLAG_SIGHTING_ID'),
      value('UI_FLAG_HUNTER_ID'),
    ] as const
    await adminConsole.reviews.openFlag(...args)
    await adminConsole.reviews.requestUphold()
    await adminConsole.cancel()
    await adminConsole.reviews.requestUphold()
    await adminConsole.reviews.uphold(10)
    await adminConsole.reviews.openFlag(...args, 'Upheld')
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeVisible()
    await evidence(page, 'upheld-disposable-flag')
  })
})
