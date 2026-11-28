import { z } from "zod";
import type { InputHTMLAttributes } from "react";
import type { FormField } from "@/types/database";

/**
 * Builds a zod schema dynamically from FormField[] configuration.
 */
export function buildZodSchema(fields: FormField[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case "number": {
        // Allow empty string → null via preprocess
        let numSchema = z.coerce.number();
        if (field.required) {
          numSchema = numSchema.min(1, `${field.label} es requerido`);
        }
        schema = field.required
          ? numSchema
          : z.preprocess(
              (val) => (val === "" || val === null || val === undefined ? undefined : val),
              numSchema.optional()
            );
        break;
      }

      case "checkbox": {
        schema = z.boolean();
        break;
      }

      case "email": {
        let strSchema = z.string();
        if (field.required) {
          strSchema = strSchema.min(1, `${field.label} es requerido`).email("Email inválido");
        } else {
          // Optional email — allow empty string or valid email
          schema = z
            .string()
            .refine(
              (val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
              { message: "Email inválido" }
            );
          break;
        }
        schema = strSchema;
        break;
      }

      case "select": {
        let strSchema = z.string();
        if (field.required) {
          strSchema = strSchema.min(1, `${field.label} es requerido`);
        }
        schema = strSchema;
        break;
      }

      case "date": {
        let strSchema = z.string();
        if (field.required) {
          strSchema = strSchema.min(1, `${field.label} es requerido`);
        }
        schema = strSchema;
        break;
      }

      default: {
        // text, textarea
        let strSchema = z.string();
        if (field.required) {
          strSchema = strSchema.min(1, `${field.label} es requerido`);
        }
        if (field.minLength) {
          strSchema = strSchema.min(
            field.minLength,
            `${field.label} debe tener al menos ${field.minLength} caracteres`
          );
        }
        if (field.maxLength) {
          strSchema = strSchema.max(
            field.maxLength,
            `${field.label} debe tener máximo ${field.maxLength} caracteres`
          );
        }
        schema = strSchema;
        break;
      }
    }

    // If the field has a custom validation callback, wrap with superRefine
    if (field.validation) {
      const validationFn = field.validation;
      const baseSchema = schema;
      schema = z.any().superRefine((val, ctx) => {
        // First validate the base schema
        const baseResult = baseSchema.safeParse(val);
        if (!baseResult.success) {
          for (const issue of baseResult.error.issues) {
            ctx.addIssue({
              code: "custom" as any,
              message: issue.message,
            });
          }
          return;
        }
        // Then run the custom validation
        const errorMsg = validationFn(val);
        if (errorMsg) {
          ctx.addIssue({
            code: "custom" as any,
            message: errorMsg,
          });
        }
      });
    }

    shape[field.name] = schema;
  }

  return z.object(shape);
}

/**
 * Builds default values from FormField[] config + optional initial entity data.
 */
export function buildDefaultValues(
  fields: FormField[],
  initial?: Record<string, unknown> | null
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = initial?.[field.name];

    if (field.type === "checkbox") {
      defaults[field.name] = rawValue === true;
    } else if (field.type === "select") {
      defaults[field.name] =
        rawValue !== null && rawValue !== undefined ? String(rawValue) : "";
    } else {
      defaults[field.name] = rawValue ?? "";
    }
  }

  return defaults;
}

/**
 * Prepares form data for Supabase: converts _id fields to parseInt,
 * checkboxes to boolean, empty strings to null, etc.
 */
export function prepareFormData(
  data: Record<string, unknown>,
  fields: FormField[]
): Record<string, unknown> {
  const prepared = { ...data };

  for (const field of fields) {
    const val = prepared[field.name];
    const isEmpty = val === "" || val === null || val === undefined;

    if (field.type === "checkbox") {
      prepared[field.name] = val === true;
    } else if (field.name.includes("_id")) {
      prepared[field.name] = isEmpty ? null : parseInt(String(val), 10);
    } else if (field.type === "number") {
      prepared[field.name] = isEmpty ? null : Number(val);
    } else if (field.type === "date") {
      prepared[field.name] = isEmpty ? null : val;
    }
  }

  return prepared;
}

/**
 * Mobile-friendly input attributes so touch devices show the right keyboard
 * and can autofill contact data.
 */
export function getInputAttributes(
  field: Pick<FormField, "type">
): Pick<InputHTMLAttributes<HTMLInputElement>, "inputMode" | "autoComplete"> {
  switch (field.type) {
    case "tel":
      return { inputMode: "tel", autoComplete: "tel" };
    case "email":
      return { inputMode: "email", autoComplete: "email" };
    case "number":
      return { inputMode: "numeric" };
    default:
      return {};
  }
}
