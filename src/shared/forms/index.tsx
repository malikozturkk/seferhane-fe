"use client"

/**
 * React Hook Form + Zod adapters for the design system. Every form in the app
 * uses these so validation, error display and server field errors behave the same.
 */
import { zodResolver } from "@hookform/resolvers/zod"
import type { ComponentProps, ReactNode } from "react"
import {
  FormProvider,
  get,
  useForm,
  useFormContext,
  type FieldValues,
  type Path,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form"
import type { z, ZodType } from "zod"
import {
  Checkbox,
  DatePicker,
  FormField,
  Input,
  Select,
  Textarea,
  type SelectOption,
} from "@/design-system"
import { ApiClientError } from "../api/http"

export function useZodForm<S extends ZodType<FieldValues, FieldValues>>(
  schema: S,
  options?: Omit<UseFormProps<z.input<S>, unknown, z.output<S>>, "resolver">,
) {
  return useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as never,
    mode: "onTouched",
    ...options,
  })
}

/** Copies API field errors (400 problem `errors`) onto the form. Returns true if any were applied. */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T, unknown, never>, error: unknown) {
  if (!(error instanceof ApiClientError)) return false
  const entries = Object.entries(error.fieldErrors)
  for (const [name, message] of entries) form.setError(name as Path<T>, { type: "server", message })
  return entries.length > 0
}

export function Form<TIn extends FieldValues, TOut extends FieldValues>({
  form,
  onSubmit,
  children,
  id,
  className,
}: {
  form: UseFormReturn<TIn, unknown, TOut>
  onSubmit: SubmitHandler<TOut>
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <FormProvider {...form}>
      <form id={id} className={className} noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  )
}

interface FieldBase {
  name: string
  label: ReactNode
  hint?: ReactNode
  required?: boolean
  optional?: boolean | string
  flush?: boolean
}

function useFieldError(name: string): string | undefined {
  const {
    formState: { errors },
  } = useFormContext()
  return (get(errors, name) as { message?: string } | undefined)?.message
}

export function FormInput({
  name,
  label,
  hint,
  required,
  optional,
  flush,
  ...props
}: FieldBase & Omit<ComponentProps<typeof Input>, "name">) {
  const { register } = useFormContext()
  return (
    <FormField label={label} hint={hint} required={required} optional={optional} error={useFieldError(name)} flush={flush}>
      <Input {...props} {...register(name)} />
    </FormField>
  )
}

export function FormTextarea({
  name,
  label,
  hint,
  required,
  optional,
  flush,
  ...props
}: FieldBase & Omit<ComponentProps<typeof Textarea>, "name">) {
  const { register } = useFormContext()
  return (
    <FormField label={label} hint={hint} required={required} optional={optional} error={useFieldError(name)} flush={flush}>
      <Textarea {...props} {...register(name)} />
    </FormField>
  )
}

export function FormSelect({
  name,
  label,
  hint,
  required,
  optional,
  flush,
  options,
  ...props
}: FieldBase & { options: SelectOption[] } & Omit<ComponentProps<typeof Select>, "name" | "options">) {
  const { register } = useFormContext()
  return (
    <FormField label={label} hint={hint} required={required} optional={optional} error={useFieldError(name)} flush={flush}>
      <Select options={options} {...props} {...register(name)} />
    </FormField>
  )
}

export function FormDate({
  name,
  label,
  hint,
  required,
  optional,
  flush,
  ...props
}: FieldBase & Omit<ComponentProps<typeof DatePicker>, "name">) {
  const { register } = useFormContext()
  return (
    <FormField label={label} hint={hint} required={required} optional={optional} error={useFieldError(name)} flush={flush}>
      <DatePicker {...props} {...register(name)} />
    </FormField>
  )
}

export function FormCheckbox({
  name,
  label,
  ...props
}: { name: string; label: ReactNode } & Omit<ComponentProps<typeof Checkbox>, "name" | "label">) {
  const { register } = useFormContext()
  return <Checkbox label={label} {...props} {...register(name)} />
}

/** Root-level (non field) server error, e.g. a 409 rule violation shown inside a form. */
export function useFormRootError() {
  return useFieldError("root")
}
