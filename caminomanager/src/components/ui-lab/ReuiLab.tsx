"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataGrid } from "@/components/ui/data-grid"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const countryOptions = [
  { value: "co", label: "Colombia", description: "América del Sur" },
  { value: "ec", label: "Ecuador", description: "América del Sur" },
  { value: "es", label: "España", description: "Europa" },
  { value: "mx", label: "México", description: "América del Norte" },
]

type City = {
  name: string
  department: string
  country: string
}

const cityRows: City[] = [
  { name: "Bogotá", department: "Distrito Capital", country: "Colombia" },
  { name: "Cali", department: "Valle del Cauca", country: "Colombia" },
  { name: "Guayaquil", department: "Guayas", country: "Ecuador" },
  { name: "Madrid", department: "Comunidad de Madrid", country: "España" },
  { name: "Medellín", department: "Antioquia", country: "Colombia" },
  { name: "Quito", department: "Pichincha", country: "Ecuador" },
]

const cityColumns: ColumnDef<City>[] = [
  { accessorKey: "name", header: "Ciudad" },
  { accessorKey: "department", header: "Departamento" },
  { accessorKey: "country", header: "País" },
]

export function ReuiLab() {
  const [country, setCountry] = React.useState("")
  const [countryError, setCountryError] = React.useState("")
  const [saved, setSaved] = React.useState(false)
  const [deleted, setDeleted] = React.useState(false)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  // TanStack Table devuelve una instancia mutable por diseño; el laboratorio
  // necesita conservar ese contrato para compararlo con el DataGrid candidato.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: cityRows,
    columns: cityColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 4 } },
  })

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 bg-background p-4 text-foreground sm:p-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Fase 2 · laboratorio aislado</p>
        <h1 className="text-3xl font-bold tracking-tight">Evaluación ReUI</h1>
        <p className="max-w-3xl text-muted-foreground">
          Prototipos sin conexión a Supabase para validar interacción, accesibilidad,
          responsive y compatibilidad con la fachada actual.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Formularios y diálogo">
        <Card>
          <CardHeader>
            <CardTitle>Autocomplete + Field</CardTitle>
            <CardDescription>
              Selector simple con búsqueda, teclado, estado vacío y error asociado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!country) {
                  setCountryError("Selecciona un país")
                  setSaved(false)
                  return
                }
                setCountryError("")
                setSaved(true)
              }}
            >
              <Field>
                <FieldLabel htmlFor="lab-country">País</FieldLabel>
                <Autocomplete
                  id="lab-country"
                  options={countryOptions}
                  value={country}
                  onValueChange={(nextValue) => {
                    setCountry(nextValue)
                    setCountryError("")
                    setSaved(false)
                  }}
                  placeholder="Busca un país"
                  aria-describedby="lab-country-description lab-country-error"
                  aria-invalid={Boolean(countryError)}
                />
                <FieldDescription id="lab-country-description">
                  Escribe para filtrar o usa las flechas y Enter.
                </FieldDescription>
                {countryError && (
                  <FieldError id="lab-country-error">{countryError}</FieldError>
                )}
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit">Guardar selección</Button>
                {saved && <p role="status" className="text-sm text-green-700">Selección guardada</p>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AlertDialog destructivo</CardTitle>
            <CardDescription>
              Foco seguro en cancelar, Escape y retorno de foco al disparador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Eliminar ciudad de prueba</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar ciudad?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción es sólo una simulación del laboratorio.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setDeleted(true)}>
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {deleted && <p role="status" className="text-sm">Acción destructiva simulada</p>}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="data-grid-title">
        <Card>
          <CardHeader>
            <CardTitle id="data-grid-title">DataGrid sobre TanStack Table</CardTitle>
            <CardDescription>
              Prototipo mínimo para medir orden, filtro, paginación y overflow móvil.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field className="max-w-sm">
              <FieldLabel htmlFor="lab-grid-filter">Filtrar ciudades</FieldLabel>
              <Input
                id="lab-grid-filter"
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Ciudad, departamento o país"
              />
            </Field>
            <DataGrid table={table} emptyMessage="No hay ciudades que coincidan" />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
