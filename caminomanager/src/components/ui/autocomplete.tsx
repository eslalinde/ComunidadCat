"use client"

import * as React from "react"
import { Check, ChevronDown, LoaderCircle, X } from "lucide-react"

import { cn } from "@/lib/utils"

export type AutocompleteOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

type AutocompleteProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value"
> & {
  options: AutocompleteOption[]
  value?: string
  onValueChange?: (value: string) => void
  emptyMessage?: string
  loading?: boolean
}

function Autocomplete({
  className,
  disabled,
  emptyMessage = "Sin resultados",
  id: providedId,
  loading = false,
  onValueChange,
  options,
  placeholder,
  value = "",
  ...props
}: AutocompleteProps) {
  const generatedId = React.useId()
  const id = providedId ?? generatedId
  const listboxId = `${id}-listbox`
  const containerRef = React.useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)
  const [query, setQuery] = React.useState(selected?.label ?? "")
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)

  React.useEffect(() => {
    if (!open) setQuery(selected?.label ?? "")
  }, [open, selected?.label])

  const filteredOptions = React.useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es")
    if (!normalized || selected?.label === query) return options
    return options.filter((option) =>
      `${option.label} ${option.description ?? ""}`
        .toLocaleLowerCase("es")
        .includes(normalized)
    )
  }, [options, query, selected?.label])

  const choose = (option: AutocompleteOption) => {
    if (option.disabled) return
    onValueChange?.(option.value)
    setQuery(option.label)
    setOpen(false)
    setActiveIndex(-1)
  }

  const moveActive = (direction: 1 | -1) => {
    const enabledIndexes = filteredOptions
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0)
    if (!enabledIndexes.length) return

    const currentPosition = enabledIndexes.indexOf(activeIndex)
    const nextPosition =
      (currentPosition + direction + enabledIndexes.length) % enabledIndexes.length
    setActiveIndex(enabledIndexes[nextPosition])
  }

  return (
    <div
      ref={containerRef}
      data-slot="autocomplete"
      className="relative"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          className={cn(
            "border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 pr-16 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground md:text-sm",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className
          )}
          disabled={disabled || loading}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(-1)
            if (value) onValueChange?.("")
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setOpen(true)
              moveActive(1)
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              setOpen(true)
              moveActive(-1)
            } else if (event.key === "Enter" && open && activeIndex >= 0) {
              event.preventDefault()
              const option = filteredOptions[activeIndex]
              if (option) choose(option)
            } else if (event.key === "Escape") {
              event.preventDefault()
              setQuery(selected?.label ?? "")
              setOpen(false)
            }
          }}
          {...props}
        />
        {loading ? (
          <LoaderCircle
            aria-label="Cargando opciones"
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : (
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
            {value && (
              <button
                type="button"
                aria-label="Limpiar selección"
                disabled={disabled}
                className="flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  onValueChange?.("")
                  setQuery("")
                  setOpen(false)
                  setActiveIndex(-1)
                }}
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              aria-label={open ? "Cerrar opciones" : "Abrir opciones"}
              disabled={disabled}
              className="flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpen((current) => !current)}
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        )}
      </div>

      {open && !disabled && !loading && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                className={cn(
                  "relative flex w-full cursor-default items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none",
                  "hover:bg-accent hover:text-accent-foreground focus:bg-accent disabled:pointer-events-none disabled:opacity-50",
                  activeIndex === index && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span>
                  <span className="block">{option.label}</span>
                  {option.description && (
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export { Autocomplete }
