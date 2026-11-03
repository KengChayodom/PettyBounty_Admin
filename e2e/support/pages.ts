import { expect, type Page } from '@playwright/test'
import { confirm, disposable, openPet, requireConfig, signIn, value } from './ui'

export class LoginPage {
  constructor(readonly page: Page) {}
  async signIn(role = 'ADMIN') {
    await signIn(this.page, role)
  }
  async expectRefused() {
    await expect(this.page.getByRole('alert')).toContainText(/admin privileges required/i)
    await expect(this.page.getByRole('link', { name: 'Missing pets', exact: true })).toBeHidden()
  }
}
export class ReportsPage {
  constructor(readonly page: Page) {}
  async open() {
    await this.page.goto('/missing-pets')
    await expect(
      this.page.getByRole('heading', { name: 'Missing pet reports', exact: true }),
    ).toBeVisible()
  }
  async detail(id: string, name: string) {
    await openPet(this.page, id, name)
  }
  async filter(status: string, species: string) {
    await this.page.getByRole('button', { name: status, exact: true }).click()
    await expect(this.page).toHaveURL(new RegExp(`status=${status}`))
    await this.page.getByRole('combobox').first().selectOption({ label: species })
    await expect(
      this.page
        .getByRole('table')
        .or(this.page.getByText('No reports match this filter.', { exact: true })),
    ).toBeVisible()
    for (const row of await this.page.locator('tbody tr').all()) {
      await expect(row.locator('td').nth(1)).toHaveText(new RegExp(`^${species}$`, 'i'))
      await expect(row.locator('td').nth(2)).toHaveText(status)
    }
  }
  async requestRemoval(name: string) {
    disposable(name)
    await this.page.getByRole('button', { name: 'Remove report', exact: true }).click()
    await expect(this.page.getByRole('dialog')).toContainText(name)
  }
  async remove() {
    await confirm(this.page, 'Remove this report?', 'Remove report')
    await expect(this.page.getByText('Report removed', { exact: true })).toBeVisible()
    await expect(this.page).toHaveURL(/\/missing-pets$/)
  }
  async expectStatus(status: string) {
    await expect(this.page.getByTestId('pet-status')).toHaveText(status)
  }
}
export class ReviewsPage {
  constructor(readonly page: Page) {}
  async openFlag(id: string, sighting: string, hunter: string, status = 'Pending') {
    await this.page.goto('/reviews')
    await this.page.getByRole('button', { name: status, exact: true }).click()
    await this.page.getByTestId(`flag-${id}`).click()
    await expect(this.page.getByTestId(`sighting-${sighting}-hunter-${hunter}`)).toBeVisible()
  }
  async requestUphold() {
    await this.page.getByRole('button', { name: 'Uphold and Penalise User', exact: true }).click()
    await expect(
      this.page.getByRole('dialog').getByRole('heading', { name: 'Uphold this flag', exact: true }),
    ).toBeVisible()
  }
  async uphold(points: number) {
    await this.page.getByLabel(/Points to deduct/).fill(String(points))
    await this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Uphold and Penalise User', exact: true })
      .click()
    await expect(
      this.page.getByText(`Flag upheld: sighting withdrawn, ${points} point(s) deducted`, {
        exact: false,
      }),
    ).toBeVisible()
  }
}
export class RolesPage {
  constructor(readonly page: Page) {}
  async open() {
    await this.page.goto('/roles')
  }
  row(name: string) {
    return this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByText(name, { exact: true }) })
  }
  async findDisposable() {
    requireConfig('UI_ROLE_EMAIL', 'UI_ROLE_PASSWORD', 'UI_ROLE_USERNAME', 'UI_ADMIN_EMAIL')
    disposable(value('UI_ROLE_USERNAME'))
    expect(value('UI_ROLE_EMAIL')).not.toBe(value('UI_ADMIN_EMAIL'))
    await this.page.getByPlaceholder('user@example.com').fill(value('UI_ROLE_EMAIL'))
    await this.page.getByRole('button', { name: 'Find', exact: true }).click()
    await expect(
      this.page.getByText(value('UI_ROLE_USERNAME'), { exact: true }).first(),
    ).toBeVisible()
  }
  async grant() {
    await this.page.getByRole('button', { name: 'Grant admin', exact: true }).click()
    await confirm(this.page, 'Grant administrator access', 'Grant admin')
  }
  async withdrawIfGranted() {
    await this.open()
    await this.findDisposable()
    if (
      await this.page
        .getByText('Already an administrator. Use the panel on the right to withdraw access.', {
          exact: true,
        })
        .isVisible()
    ) {
      await this.withdraw(value('UI_ROLE_USERNAME'))
    } else {
      await expect(
        this.page.getByRole('button', { name: 'Grant admin', exact: true }),
      ).toBeVisible()
    }
  }
  async withdraw(name: string) {
    await this.row(name).getByRole('button', { name: 'Withdraw', exact: true }).click()
    await confirm(this.page, 'Withdraw administrator access', 'Withdraw admin')
    await expect(this.row(name)).toBeHidden()
  }
}
export class BountyPage {
  constructor(readonly page: Page) {}
  row(id: string) {
    return this.page.getByTestId(`bounty-${id}`)
  }
  async select(id: string, name: string) {
    disposable(name)
    await this.page.goto('/bounty')
    await expect(this.row(id).getByText(name, { exact: true })).toBeVisible()
    await this.row(id).getByRole('button').click()
  }
  async request(action: string, name: string) {
    await this.page.getByRole('button', { name: action, exact: true }).click()
    await expect(this.page.getByRole('dialog')).toContainText(name)
  }
  async rule(title: string, action: string, message: string, id: string) {
    await confirm(this.page, title, action)
    await expect(this.page.getByText(message, { exact: false })).toBeVisible()
    await expect(this.row(id)).toBeHidden()
  }
}
export class AdminConsole {
  readonly login: LoginPage
  readonly reports: ReportsPage
  readonly reviews: ReviewsPage
  readonly roles: RolesPage
  readonly bounty: BountyPage
  constructor(readonly page: Page) {
    this.login = new LoginPage(page)
    this.reports = new ReportsPage(page)
    this.reviews = new ReviewsPage(page)
    this.roles = new RolesPage(page)
    this.bounty = new BountyPage(page)
  }
  async cancel() {
    await this.page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(this.page.getByRole('dialog')).toBeHidden()
  }
}
