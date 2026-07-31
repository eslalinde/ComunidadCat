import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

const options = [
  { value: "co", label: "Colombia" },
  { value: "ec", label: "Ecuador" },
  { value: "es", label: "España", disabled: true },
]

describe("componentes del laboratorio ReUI", () => {
  it("asocia la etiqueta y el error del Field con el control", () => {
    render(
      <Field>
        <FieldLabel htmlFor="country">País</FieldLabel>
        <input id="country" aria-describedby="country-error" />
        <FieldError id="country-error">Selecciona un país</FieldError>
      </Field>
    )

    expect(screen.getByLabelText("País")).toHaveAccessibleDescription(
      "Selecciona un país"
    )
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("filtra y selecciona el Autocomplete con teclado", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    function ControlledAutocomplete() {
      const [value, setValue] = React.useState("")
      return (
        <Autocomplete
          aria-label="País"
          options={options}
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue)
            onValueChange(nextValue)
          }}
          placeholder="Busca un país"
        />
      )
    }

    render(<ControlledAutocomplete />)

    const combobox = screen.getByRole("combobox", { name: "País" })
    await user.click(combobox)
    await user.type(combobox, "ecu")
    await user.keyboard("{ArrowDown}{Enter}")

    expect(onValueChange).toHaveBeenLastCalledWith("ec")
    expect(combobox).toHaveValue("Ecuador")
    expect(combobox).toHaveAttribute("aria-expanded", "false")
  })

  it("muestra el estado sin resultados", async () => {
    const user = userEvent.setup()
    render(<Autocomplete aria-label="País" options={options} />)

    await user.type(screen.getByRole("combobox", { name: "País" }), "zzz")
    expect(screen.getByText("Sin resultados")).toBeInTheDocument()
  })

  it("ignora la navegación cuando todas las opciones están deshabilitadas", async () => {
    const user = userEvent.setup()
    render(
      <Autocomplete
        aria-label="País"
        options={[{ value: "co", label: "Colombia", disabled: true }]}
      />
    )

    const combobox = screen.getByRole("combobox", { name: "País" })
    await user.click(combobox)
    await user.keyboard("{ArrowDown}{Enter}")

    expect(combobox).toHaveValue("")
    expect(combobox).not.toHaveAttribute("aria-activedescendant")
  })

  it("cancela el AlertDialog y devuelve el foco al disparador", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <AlertDialog>
        <AlertDialogTrigger>Eliminar ciudad</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar ciudad?</AlertDialogTitle>
          <AlertDialogDescription>La acción es permanente.</AlertDialogDescription>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole("button", { name: "Eliminar ciudad" })
    await user.click(trigger)
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
