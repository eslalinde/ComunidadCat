import { Fragment, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { friendlyError } from "@/lib/supabaseErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { BaseEntity, FormField as FormFieldType } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { needsLocationFields } from "@/config/carisma";
import { cn } from "@/lib/utils";
import { buildZodSchema, buildDefaultValues, prepareFormData } from "@/lib/form-schema";
import {
  useCountryOptions,
  useStateOptions,
  useCityOptions,
  useAllCityOptions,
  useZoneOptions,
  useDioceseOptions,
  useParishOptions,
  useAllParishOptions,
  usePeopleOptions,
  useCathechistTeamOptions,
  useEntityOptions,
} from "@/hooks/useEntityOptions";

interface DynamicEntityModalProps<T extends BaseEntity> {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<T, "id" | "created_at" | "updated_at">) => Promise<void>;
  initial?: T | null;
  fields: FormFieldType[];
  title: string;
  loading?: boolean;
  size?: "default" | "wide";
}

export function DynamicEntityModal<T extends BaseEntity>({
  open,
  onClose,
  onSave,
  initial,
  fields,
  title,
  loading = false,
  size = "default",
}: DynamicEntityModalProps<T>) {
  const schema = useMemo(() => buildZodSchema(fields), [fields]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(fields, initial as Record<string, unknown> | null),
  });

  // Refs for tracking previous cascading values
  const prevCountryId = useRef<string>("");
  const prevStateId = useRef<string>("");
  const prevCityId = useRef<string>("");
  const prevLocationCountryId = useRef<string>("");
  const isInitialized = useRef(false);

  // Watch values for cascading and conditional visibility
  const countryId = form.watch("country_id") as string;
  const stateId = form.watch("state_id") as string;
  const cityId = form.watch("city_id") as string;
  const locationCountryId = form.watch("location_country_id") as string;
  const personTypeId = form.watch("person_type_id") as string;
  const isItinerante = form.watch("is_itinerante") as boolean;

  // Helper to convert string form values to number | undefined for hooks
  const toNum = (val: string | undefined): number | undefined => {
    if (!val) return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  };

  // Hooks para opciones dependientes
  const { options: countryOptions, loading: countryOptionsLoading } = useCountryOptions();
  const { options: stateOptions, loading: stateOptionsLoading } = useStateOptions(toNum(countryId));

  // Determinar si el formulario tiene campos de país y departamento
  const hasCountryField = fields.some((f) => f.name === "country_id");
  const hasStateField = fields.some((f) => f.name === "state_id");
  const hasCityField = fields.some((f) => f.name === "city_id");

  // Usar el hook apropiado para ciudades
  /* eslint-disable react-hooks/rules-of-hooks */
  const { options: cityOptions } =
    hasCountryField || hasStateField
      ? useCityOptions(toNum(countryId), toNum(stateId))
      : useAllCityOptions();
  /* eslint-enable react-hooks/rules-of-hooks */

  // Zonas filtradas por ciudad
  const { options: zoneOptions } = useZoneOptions(toNum(cityId));

  // Diócesis
  const { options: dioceseOptions } = useDioceseOptions();

  // Usar el hook apropiado para parroquias
  /* eslint-disable react-hooks/rules-of-hooks */
  const { options: parishOptions } = hasCityField
    ? useParishOptions(toNum(cityId))
    : useAllParishOptions();
  /* eslint-enable react-hooks/rules-of-hooks */
  const { options: peopleOptions, loading: peopleLoading } = usePeopleOptions(
    initial?.id
  );
  const { options: stepWayOptions } = useEntityOptions({
    tableName: "step_ways",
    orderBy: { field: "order_num", asc: true },
  });
  const { options: cathechistTeamOptions } = useCathechistTeamOptions();

  // Ciudades filtradas por país de ubicación (para campos location_country_id → location_city_id)
  const { options: locationCityOptions } = useCityOptions(
    toNum(locationCountryId),
    undefined
  );

  // Initialize/reset form when modal opens
  useEffect(() => {
    if (open) {
      const defaults = buildDefaultValues(fields, initial as Record<string, unknown> | null);
      form.reset(defaults);

      // Initialize refs with current values
      prevCountryId.current = (defaults.country_id as string) || "";
      prevStateId.current = (defaults.state_id as string) || "";
      prevCityId.current = (defaults.city_id as string) || "";
      prevLocationCountryId.current = (defaults.location_country_id as string) || "";
      isInitialized.current = true;
    } else {
      isInitialized.current = false;
    }
  }, [open, initial, fields, form]);

  // Re-sincronizar spouse_id cuando se carguen las opciones de personas
  const initialSpouseId = (initial as Record<string, unknown>)?.spouse_id;

  useEffect(() => {
    if (!isInitialized.current || !open || peopleLoading) return;

    if (peopleOptions && peopleOptions.length > 0 && initialSpouseId) {
      const currentSpouseValue = form.getValues("spouse_id") as string;
      const expectedSpouseValue = String(initialSpouseId);

      if (currentSpouseValue !== expectedSpouseValue) {
        form.setValue("spouse_id", expectedSpouseValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleOptions, peopleLoading, initialSpouseId, open]);

  // Limpiar campos dependientes cuando cambia el padre (solo después de la inicialización)
  // Guard: solo ejecutar si el campo padre existe en el formulario
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!fields.some((f) => f.name === "country_id")) return;

    if (countryId !== prevCountryId.current) {
      if (fields.some((f) => f.name === "state_id")) {
        form.setValue("state_id", "");
      }
      if (fields.some((f) => f.name === "city_id")) {
        form.setValue("city_id", "");
      }
      prevCountryId.current = countryId;
    }
  }, [countryId, fields, form]);

  useEffect(() => {
    if (!isInitialized.current) return;
    if (!fields.some((f) => f.name === "state_id")) return;

    if (stateId !== prevStateId.current) {
      if (fields.some((f) => f.name === "city_id")) {
        form.setValue("city_id", "");
      }
      prevStateId.current = stateId;
    }
  }, [stateId, fields, form]);

  useEffect(() => {
    if (!isInitialized.current) return;
    if (!fields.some((f) => f.name === "city_id")) return;

    if (cityId !== prevCityId.current) {
      if (fields.some((f) => f.name === "zone_id")) {
        form.setValue("zone_id", "");
      }
      prevCityId.current = cityId;
    }
  }, [cityId, fields, form]);

  useEffect(() => {
    if (!isInitialized.current) return;
    if (!fields.some((f) => f.name === "location_country_id")) return;

    if (locationCountryId !== prevLocationCountryId.current) {
      if (fields.some((f) => f.name === "location_city_id")) {
        form.setValue("location_city_id", "");
      }
      prevLocationCountryId.current = locationCountryId;
    }
  }, [locationCountryId, fields, form]);

  // Side effects: person_type_id changes
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!fields.some((f) => f.name === "person_type_id")) return;

    const numValue = personTypeId ? Number(personTypeId) : null;
    const isMarried = numValue === 1;
    if (!isMarried && fields.some((f) => f.name === "spouse_id")) {
      form.setValue("spouse_id", "");
    }
    if (
      !needsLocationFields(numValue, isItinerante) &&
      fields.some((f) => f.name === "location_country_id")
    ) {
      form.setValue("location_country_id", "");
      form.setValue("location_city_id", "");
    }
  }, [personTypeId, fields, form, isItinerante]);

  // Side effects: is_itinerante changes
  useEffect(() => {
    if (!isInitialized.current) return;
    if (!fields.some((f) => f.name === "is_itinerante")) return;

    const numType = personTypeId ? Number(personTypeId) : null;
    if (
      !needsLocationFields(numType, isItinerante) &&
      fields.some((f) => f.name === "location_country_id")
    ) {
      form.setValue("location_country_id", "");
      form.setValue("location_city_id", "");
    }
  }, [isItinerante, personTypeId, fields, form]);

  const getFieldOptions = (fieldName: string) => {
    if (!fields.some((f) => f.name === fieldName)) {
      return undefined;
    }

    const fieldConfig = fields.find((f) => f.name === fieldName);
    if (fieldConfig && fieldConfig.options && fieldConfig.options.length > 0) {
      return fieldConfig.options;
    }

    switch (fieldName) {
      case "country_id":
        return countryOptions && countryOptions.length > 0
          ? countryOptions
          : [];
      case "state_id":
        return stateOptions && stateOptions.length > 0 ? stateOptions : [];
      case "city_id":
        return cityOptions && cityOptions.length > 0 ? cityOptions : [];
      case "zone_id":
        return zoneOptions && zoneOptions.length > 0 ? zoneOptions : [];
      case "diocese_id":
        return dioceseOptions && dioceseOptions.length > 0
          ? dioceseOptions
          : [];
      case "parish_id":
        return parishOptions && parishOptions.length > 0 ? parishOptions : [];
      case "spouse_id":
        return peopleOptions && peopleOptions.length > 0 ? peopleOptions : [];
      case "step_way_id":
        return stepWayOptions && stepWayOptions.length > 0
          ? stepWayOptions
          : [];
      case "cathechist_team_id":
        return cathechistTeamOptions && cathechistTeamOptions.length > 0
          ? cathechistTeamOptions
          : [];
      case "location_country_id":
        return countryOptions && countryOptions.length > 0
          ? countryOptions
          : [];
      case "location_city_id":
        return locationCityOptions && locationCityOptions.length > 0
          ? locationCityOptions
          : [];
      default:
        return fieldName.includes("_id") ? [] : undefined;
    }
  };

  const isFieldLoading = (fieldName: string) => {
    if (fieldName === "country_id") return countryOptionsLoading;
    if (fieldName === "state_id") return stateOptionsLoading;
    return false;
  };

  const onSubmit = async (data: Record<string, unknown>) => {
    const prepared = prepareFormData(data, fields);

    try {
      await onSave(
        prepared as Omit<T, "id" | "created_at" | "updated_at">
      );
    } catch (error: any) {
      console.error("Error saving entity:", error);
      alert(friendlyError(error, "Error al guardar. Por favor, intenta de nuevo."));
    }
  };

  const visibleFields = fields.filter((field) => {
    if (field.name === "zone_id" && zoneOptions.length === 0) {
      return false;
    }

    if (
      field.name === "location_country_id" ||
      field.name === "location_city_id"
    ) {
      const numType = personTypeId ? Number(personTypeId) : null;
      return needsLocationFields(numType, isItinerante);
    }

    if (field.name === "spouse_id") {
      return Number(personTypeId) === 1;
    }

    return true;
  });
  const isComplexForm =
    fields.length >= 6 || fields.some((field) => field.formSection);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto",
          isComplexForm && (size === "wide" ? "sm:max-w-3xl" : "sm:max-w-2xl")
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Complete los campos requeridos. Puede buscar escribiendo en los
            selectores de relaciones.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn(
              "grid grid-cols-1 gap-4",
              isComplexForm && "sm:grid-cols-2"
            )}
          >
            {visibleFields.map((field) => {
              const fieldOptions = getFieldOptions(field.name);

              // Render checkbox fields with their own layout
              if (field.type === "checkbox") {
                return (
                  <Fragment key={field.name}>
                    {field.formSection && (
                      <FormSectionTitle title={field.formSection} />
                    )}
                    <FormField
                      control={form.control}
                      name={field.name}
                      render={({ field: rhfField }) => (
                        <FormItem
                          className={cn(
                            "flex flex-row items-center gap-3 space-y-0 rounded-md border p-3",
                            field.fullWidth && "sm:col-span-2"
                          )}
                        >
                          <FormControl>
                            <Checkbox
                              checked={rhfField.value === true}
                              onCheckedChange={rhfField.onChange}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer font-medium">
                            {field.label}
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Fragment>
                );
              }

              return (
                <Fragment key={field.name}>
                  {field.formSection && (
                    <FormSectionTitle title={field.formSection} />
                  )}
                  <FormField
                    control={form.control}
                    name={field.name}
                    render={({ field: rhfField }) => (
                      <FormItem
                        className={cn(
                          (field.fullWidth || field.type === "textarea") &&
                            "sm:col-span-2"
                        )}
                      >
                        <FormLabel>
                          {field.label}
                          {field.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                        {field.type === "textarea" ? (
                          <Textarea
                            value={(rhfField.value as string) || ""}
                            onChange={rhfField.onChange}
                            onBlur={rhfField.onBlur}
                            maxLength={field.maxLength}
                            minLength={field.minLength}
                            placeholder={field.placeholder}
                            disabled={loading}
                            rows={3}
                          />
                        ) : field.type === "select" && field.searchable ? (
                          <Autocomplete
                            options={(fieldOptions || field.options || []).map((option) => ({
                              value: String(option.value),
                              label: option.label,
                            }))}
                            value={
                              rhfField.value !== null && rhfField.value !== undefined
                                ? String(rhfField.value)
                                : ""
                            }
                            onValueChange={rhfField.onChange}
                            onBlur={rhfField.onBlur}
                            placeholder={field.placeholder || "Buscar..."}
                            emptyMessage={
                              field.name === "state_id" && !countryId
                                ? "Seleccione primero un país"
                                : field.name === "location_city_id" &&
                                    !locationCountryId
                                  ? "Seleccione primero el país de ubicación"
                                : "No se encontraron opciones"
                            }
                            loading={isFieldLoading(field.name)}
                            disabled={
                              loading ||
                              (field.name === "state_id" && !countryId) ||
                              (field.name === "location_city_id" &&
                                !locationCountryId)
                            }
                          />
                        ) : field.type === "select" ? (
                          (() => {
                            const opts = fieldOptions || field.options || [];
                            const currentVal = rhfField.value !== null && rhfField.value !== undefined ? String(rhfField.value) : "";
                            const selectedLabel = currentVal ? opts.find(o => String(o.value) === currentVal)?.label : null;
                            return (
                              <Select
                                value={currentVal}
                                onValueChange={rhfField.onChange}
                                disabled={loading}
                              >
                                <SelectTrigger>
                                  {selectedLabel ? (
                                    <span className="truncate min-w-0">{selectedLabel}</span>
                                  ) : (
                                    <SelectValue
                                      placeholder={
                                        field.placeholder || "Seleccionar..."
                                      }
                                    />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  {opts.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={String(option.value)}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()
                        ) : (
                          <Input
                            type={field.type}
                            value={(rhfField.value as string) || ""}
                            onChange={rhfField.onChange}
                            onBlur={rhfField.onBlur}
                            maxLength={field.maxLength}
                            minLength={field.minLength}
                            placeholder={field.placeholder}
                            disabled={loading}
                            className={
                              field.name === "code"
                                ? "uppercase"
                                : field.type === "date"
                                  ? "date-input"
                                  : ""
                            }
                          />
                        )}
                        </FormControl>
                        {field.description && (
                          <FormDescription>{field.description}</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Fragment>
              );
            })}

            <DialogFooter
              className="col-span-full mt-2 w-full gap-3 border-t border-gray-100 pt-4 sm:justify-end"
            >
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function FormSectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b pb-2 pt-1 sm:col-span-2" data-slot="form-section">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}
