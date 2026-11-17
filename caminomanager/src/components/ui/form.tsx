"use client"

import * as React from "react"
import { Form as FormPrimitive, Slot } from "radix-ui"
import { CircleAlert } from "lucide-react"
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"

/**
 * Form building blocks.
 *
 * Validation rules live in react-hook-form + zod (single source of truth).
 * The DOM layer is Radix `Form` (https://www.radix-ui.com/primitives/docs/components/form)
 * for root, field, label and message: RHF errors are fed in through
 * `serverInvalid`, which exposes `data-invalid` for styling. The control itself
 * is wired with a plain Slot (see FormControl).
 */

const Form = FormProvider

/** `<form>` element powered by Radix Form. Native browser bubbles are disabled. */
function FormRoot({
  noValidate = true,
  ...props
}: React.ComponentProps<typeof FormPrimitive.Root>) {
  return <FormPrimitive.Root data-slot="form" noValidate={noValidate} {...props} />
}

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const FormItemContext = React.createContext<{ id: string }>({ id: "" })

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)
  const { id } = itemContext

  // "Reward early, punish late": surface an error only once the user typed in
  // the field or tried to submit. Merely passing through an empty field (e.g.
  // dialog autofocus, then clicking elsewhere) must not flag it; that would
  // also shift the layout under the pointer between mousedown and click.
  const error =
    fieldState.error && (formState.isSubmitted || fieldState.isDirty)
      ? fieldState.error
      : undefined

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formLabelId: `${id}-form-item-label`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
    error,
    invalid: !!error,
  }
}

type FormItemProps = Omit<
  React.ComponentProps<typeof FormPrimitive.Field>,
  "name" | "serverInvalid"
>

function FormItem(props: FormItemProps) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <FormItemField {...props} />
    </FormItemContext.Provider>
  )
}

function FormItemField({ className, ...props }: FormItemProps) {
  const { name, error } = useFormField()

  return (
    <FormPrimitive.Field
      data-slot="form-item"
      name={name}
      serverInvalid={!!error}
      // content-start: when a sibling column is taller (help text, error), keep
      // label and control packed at the top instead of spreading the extra height.
      className={cn("group/field grid content-start gap-2", className)}
      {...props}
    />
  )
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof FormPrimitive.Label>) {
  const { formItemId, formLabelId } = useFormField()

  return (
    <FormPrimitive.Label
      data-slot="form-label"
      id={formLabelId}
      className={cn(
        "flex items-center gap-1 text-sm leading-none font-medium text-foreground select-none",
        className
      )}
      htmlFor={formItemId}
      {...props}
    />
  )
}

/** Muted required marker. Assistive tech gets "obligatorio" as text. */
function RequiredMark({ className }: { className?: string }) {
  return (
    <span data-slot="required-mark" className={cn("font-normal text-muted-foreground", className)}>
      <span aria-hidden="true">*</span>
      <span className="sr-only">(obligatorio)</span>
    </span>
  )
}

/**
 * Wires id / aria attributes onto the child control.
 *
 * Deliberately a plain Slot rather than Radix `Form.Control`: that primitive
 * targets native inputs and injects `onChange` / `name` / `onInvalid`, which
 * override the internal handlers of composite controls (Autocomplete, Select,
 * Checkbox). Focus on the first invalid field comes from react-hook-form.
 *
 * `aria-labelledby` points at the FormLabel so composite controls rendered as
 * non-labelable elements (RadioGroup, Select trigger) are named by it too;
 * `<label for>` alone only names native inputs. A child's own aria-label wins.
 */
function FormControl(props: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formLabelId, formDescriptionId, formMessageId } = useFormField()
  const child = props.children
  const hasOwnName =
    React.isValidElement<{ "aria-label"?: string }>(child) && !!child.props["aria-label"]

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-labelledby={hasOwnName ? undefined : formLabelId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error || undefined}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-xs leading-4", className)}
      {...props}
    />
  )
}

/**
 * Shared style for inline field hints: one step smaller than the label (12px vs
 * 14px), muted rose tone, never color-only.
 */
const fieldErrorClassName =
  "flex items-start gap-1 text-xs leading-4 font-normal text-field-error-foreground animate-in fade-in-0 slide-in-from-top-1 duration-200"

/**
 * Inline validation hint. Warm low-chroma tone instead of alarm red, an icon so
 * the state is not conveyed by color alone, and a gentle entrance animation.
 */
function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? "") : children

  if (!body) {
    return null
  }

  if (!error) {
    return (
      <p
        data-slot="form-message"
        id={formMessageId}
        className={cn("text-muted-foreground text-xs leading-4", className)}
        {...props}
      >
        {body}
      </p>
    )
  }

  return (
    // No `match` prop: Radix always renders it (RHF already decided it's invalid).
    <FormPrimitive.Message
      data-slot="form-message"
      id={formMessageId}
      className={cn(fieldErrorClassName, className)}
      {...props}
    >
      {/* Icon box is exactly one line tall so it centers on the first line. */}
      <span aria-hidden="true" className="flex h-4 shrink-0 items-center">
        <CircleAlert className="size-3" strokeWidth={2.25} />
      </span>
      <span>{body}</span>
    </FormPrimitive.Message>
  )
}

export {
  useFormField,
  Form,
  FormRoot,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  RequiredMark,
  fieldErrorClassName,
}
