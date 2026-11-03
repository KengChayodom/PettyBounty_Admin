import { test, expect, type Page } from '@playwright/test'

export function value(name: string): string {
  return process.env[name]?.trim() || ''
}
export function requireConfig(...names: string[]) {
  const missing = names.filter((name) => !value(name))
  test.skip(missing.length > 0, `NOT RUN: missing ${missing.join(', ')}`)
}
export function disposable(name: string) {
  expect(name.startsWith('AUTOUI-'), 'Mutation target must be an AUTOUI- fixture').toBeTruthy()
}
export function petPath(id: string) {
  expect(id, 'Fixture pet ID must be a UUID').toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  )
  return `/missing-pets/${id}`
}
export async function signIn(page: Page, role = 'ADMIN') {
  requireConfig(`UI_${role}_EMAIL`, `UI_${role}_PASSWORD`)
  try {
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(value(`UI_${role}_EMAIL`))
    await page.getByLabel('Password', { exact: true }).fill(value(`UI_${role}_PASSWORD`))
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  } catch {
    throw new Error('UI sign-in could not complete; credentials omitted from diagnostics')
  }
}
export async function openPet(page: Page, id: string, name: string) {
  await page.goto(petPath(id))
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
}
export async function evidence(page: Page, label: string) {
  // Explicit evidence only after authentication and a visible UI assertion.
  await test.info().attach(label, { body: await page.screenshot(), contentType: 'image/png' })
}
export async function confirm(page: Page, title: string, action: string) {
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: action, exact: true }).click()
  await expect(dialog).toBeHidden()
}
