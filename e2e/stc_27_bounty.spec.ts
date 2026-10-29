import { test, expect } from './support/fixtures'
import { evidence, requireConfig, value } from './support/ui'

test.describe('STC-27 Administrator bounty rulings', () => {
  for (const scenario of [
    {
      key: 'CONFIRM',
      title: 'Confirm this payment?',
      action: 'Confirm payment',
      status: 'Resolved',
      message: 'confirmed. The case is Resolved.',
    },
    {
      key: 'REJECT',
      title: 'Reject this payment?',
      action: 'Reject payment',
      status: 'Found',
      message: 'rejected. The owner was asked to pay again.',
    },
    {
      key: 'UNPAID',
      title: 'Close as unpaid?',
      action: 'Close as unpaid',
      status: 'Resolved',
      message: 'closed as unpaid.',
    },
  ]) {
    test(`${scenario.action} for one named disposable case`, async ({ page, adminConsole }) => {
      const prefix = `UI_BOUNTY_${scenario.key}`
      requireConfig(`${prefix}_ID`, `${prefix}_NAME`)
      const id = value(`${prefix}_ID`)
      const name = value(`${prefix}_NAME`)
      await adminConsole.bounty.select(id, name)
      if (scenario.key !== 'UNPAID')
        await expect(page.getByRole('img', { name: 'Transfer slip', exact: true })).toBeVisible()
      else
        await expect(
          page.getByRole('button', { name: 'Confirm payment', exact: true }),
        ).toBeHidden()
      await adminConsole.bounty.request(scenario.action, name)
      await adminConsole.cancel()
      await expect(adminConsole.bounty.row(id)).toBeVisible()
      await adminConsole.bounty.request(scenario.action, name)
      await adminConsole.bounty.rule(scenario.title, scenario.action, scenario.message, id)
      await adminConsole.reports.detail(id, name)
      await adminConsole.reports.expectStatus(scenario.status)
      await page.reload()
      await adminConsole.reports.expectStatus(scenario.status)
      await evidence(page, `bounty-${scenario.key.toLowerCase()}`)
    })
  }
})
