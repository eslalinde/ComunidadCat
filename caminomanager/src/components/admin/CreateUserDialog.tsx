"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { CreateUserParams } from "@/hooks/useAdminUsers";
import {
  type AppRole,
  getRoleLabel,
  roleAcceptsScope,
  roleRequiresCommunity,
  roleRequiresZone,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
  RequiredMark,
} from "@/components/ui/form";

export const MIN_PASSWORD_LENGTH = 6;

export const CREATABLE_ROLES: AppRole[] = [
  "viewer",
  "contributor",
  "admin",
  "zone_leader",
  "zone_contributor",
  "community_responsible",
];

export interface ZoneOption {
  id: number;
  name: string;
  city?: { name: string } | { name: string }[];
}

export interface CommunityOption {
  id: number;
  number: string;
  parish?: { name: string } | { name: string }[];
}

const NONE = "none";

const createUserSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Escribe el correo del usuario")
      .email("Revisa el formato del correo (ej. nombre@dominio.com)"),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres`),
    fullName: z.string(),
    role: z.enum(CREATABLE_ROLES as [AppRole, ...AppRole[]]),
    zoneId: z.string(),
    communityId: z.string(),
  })
  .superRefine((values, ctx) => {
    if (roleRequiresZone(values.role) && values.zoneId === NONE) {
      ctx.addIssue({ code: "custom", path: ["zoneId"], message: "Elige la zona que gestionará" });
    }
    if (roleRequiresCommunity(values.role) && values.communityId === NONE) {
      ctx.addIssue({
        code: "custom",
        path: ["communityId"],
        message: "Elige la comunidad de la que será responsable",
      });
    }
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

const DEFAULT_VALUES: CreateUserFormValues = {
  email: "",
  password: "",
  fullName: "",
  role: "viewer",
  zoneId: NONE,
  communityId: NONE,
};

function relationName(value: { name: string } | { name: string }[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0]?.name : value.name;
}

/** Maps validated form values to the RPC payload, dropping scope a role cannot use. */
export function toCreateUserParams(values: CreateUserFormValues): CreateUserParams {
  const zoneId = values.zoneId === NONE ? null : Number(values.zoneId);
  const communityId = values.communityId === NONE ? null : Number(values.communityId);
  const { role } = values;
  return {
    email: values.email.trim(),
    password: values.password,
    fullName: values.fullName.trim() || undefined,
    role,
    zoneId: roleRequiresZone(role) || roleAcceptsScope(role) ? zoneId : null,
    communityId: roleRequiresCommunity(role) || roleAcceptsScope(role) ? communityId : null,
  };
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones?: ZoneOption[];
  communities?: CommunityOption[];
  submitting: boolean;
  onSubmit: (params: CreateUserParams) => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  zones,
  communities,
  submitting,
  onSubmit,
}: CreateUserDialogProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    // Validate once the user leaves a field, then re-check as they type.
    mode: "onTouched",
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) form.reset(DEFAULT_VALUES);
  }, [open, form]);

  const role = form.watch("role");
  const zoneId = form.watch("zoneId");
  const optionalScope = roleAcceptsScope(role);
  const showZone = roleRequiresZone(role) || optionalScope;
  const showCommunity = roleRequiresCommunity(role) || (optionalScope && zoneId === NONE);
  // Required pickers show their placeholder until something is chosen.
  const selectValue = (value: string) => (value === NONE && !optionalScope ? "" : value);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nuevo usuario</DialogTitle>
          <DialogDescription>
            El usuario podrá iniciar sesión inmediatamente con el email y contraseña asignados.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <FormRoot
            onSubmit={form.handleSubmit((values) => onSubmit(toCreateUserParams(values)))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="off"
                      inputMode="email"
                      placeholder="correo@ejemplo.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contraseña <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Nombre del usuario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Rol <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Scope depends on the role; start fresh when it changes.
                        form.setValue("zoneId", NONE);
                        form.setValue("communityId", NONE);
                        form.clearErrors(["zoneId", "communityId"]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREATABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {getRoleLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showZone && (
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Zona {roleRequiresZone(role) ? <RequiredMark /> : null}
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={selectValue(field.value)}
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value !== NONE) form.setValue("communityId", NONE);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar zona..." />
                        </SelectTrigger>
                        <SelectContent>
                          {optionalScope && <SelectItem value={NONE}>Sin zona</SelectItem>}
                          {zones?.map((z) => (
                            <SelectItem key={z.id} value={z.id.toString()}>
                              {z.name}
                              {relationName(z.city) && ` (${relationName(z.city)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {optionalScope && (
                      <FormDescription>Opcional: limita lo que puede ver.</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showCommunity && (
              <FormField
                control={form.control}
                name="communityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Comunidad {roleRequiresCommunity(role) ? <RequiredMark /> : null}
                    </FormLabel>
                    <FormControl>
                      <Select value={selectValue(field.value)} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar comunidad..." />
                        </SelectTrigger>
                        <SelectContent>
                          {optionalScope && <SelectItem value={NONE}>Sin comunidad</SelectItem>}
                          {communities?.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              Comunidad {c.number}
                              {relationName(c.parish) && ` - ${relationName(c.parish)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {optionalScope && (
                      <FormDescription>Opcional: limita lo que puede ver.</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                {submitting ? "Creando…" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </FormRoot>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
