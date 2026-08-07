import { expect, test } from "@playwright/test"

test.describe("laboratorio ReUI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ui-lab")
  })

  test("Autocomplete funciona por teclado, valida y se puede limpiar", async ({ page }) => {
    const country = page.getByRole("combobox", { name: "País" })

    await country.fill("ecu")
    await country.press("ArrowDown")
    await country.press("Enter")
    await expect(country).toHaveValue("Ecuador")

    await page.getByRole("button", { name: "Guardar selección" }).click()
    await expect(page.getByRole("status")).toHaveText("Selección guardada")

    await page.getByRole("button", { name: "Limpiar selección" }).click()
    await page.getByRole("button", { name: "Guardar selección" }).click()
    await expect(page.locator("#lab-country-error")).toHaveText("Selecciona un país")
  })

  test("AlertDialog cancela con Escape y devuelve el foco", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Eliminar ciudad de prueba" })
    await trigger.click()
    await expect(page.getByRole("alertdialog")).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused()

    await page.keyboard.press("Escape")
    await expect(page.getByRole("alertdialog")).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test("AlertDialog confirma explícitamente", async ({ page }) => {
    await page.getByRole("button", { name: "Eliminar ciudad de prueba" }).click()
    await page.getByRole("button", { name: "Eliminar", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Acción destructiva simulada")
  })

  test("DataGrid filtra, ordena y pagina", async ({ page }) => {
    const grid = page.getByRole("table")
    await expect(grid.getByRole("cell", { name: "Bogotá" })).toBeVisible()
    await expect(page.getByText("Página 1 de 2")).toBeVisible()

    await page.getByLabel("Filtrar ciudades").fill("Ecuador")
    await expect(grid.getByRole("cell", { name: "Quito" })).toBeVisible()
    await expect(grid.getByRole("cell", { name: "Bogotá" })).toBeHidden()

    await page.getByLabel("Filtrar ciudades").fill("")
    await grid.getByRole("button", { name: /Ciudad/ }).click()
    await expect(grid.getByRole("columnheader", { name: /Ciudad/ })).toHaveAttribute(
      "aria-sort",
      "ascending"
    )

    await page.getByRole("button", { name: "Siguiente" }).click()
    await expect(page.getByText("Página 2 de 2")).toBeVisible()
  })
})
