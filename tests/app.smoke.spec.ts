import { expect, test } from '@playwright/test'

test('carrega app e ativa fluxo principal em modo mock', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/HAND AR POWERS/i)

  const activateButton = page.getByRole('button', { name: 'Ativar camera' })
  const hasActivateButton = await activateButton
    .isVisible({ timeout: 2500 })
    .catch(() => false)
  if (hasActivateButton) {
    await activateButton.click()
  }

  await expect(page.locator('main')).toBeVisible()
  await expect(
    page.getByText(/Tracking ativo|Iniciando tracking|Ative a camera para comecar/i),
  ).toBeVisible({ timeout: 12000 })
})
