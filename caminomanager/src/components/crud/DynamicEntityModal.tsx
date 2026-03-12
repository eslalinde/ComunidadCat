import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { friendlyError } from "@/lib/supabaseErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FormMessage,
} from "@/components/ui/form";
import { BaseEntity, FormField as FormFieldType } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { needsLocationFields } from "@/config/carisma";
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
}

export function DynamicEntityModal<T extends BaseEntity>({
  open,
  onClose,
  onSave,
  initial,
  fields,
  title,
  loading = false,
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
  const { options: countryOptions } = useCountryOptions();
  const { options: stateOptions } = useStateOptions(toNum(countryId));

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-[calc(100%-2rem)] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-xl font-bold mb-5 pr-8">{title}</h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field) => {
              const fieldOptions = getFieldOptions(field.name);

              // Solo mostrar zone_id si la ciudad seleccionada tiene zonas
              if (field.name === "zone_id") {
                if (!zoneOptions || zoneOptions.length === 0) {
                  return null;
                }
              }

              // Solo mostrar ubicación si el tipo requiere ubicación o es itinerante
              if (
                field.name === "location_country_id" ||
                field.name === "location_city_id"
              ) {
                const numType = personTypeId ? Number(personTypeId) : null;
                if (!needsLocationFields(numType, isItinerante)) {
                  return null;
                }
              }

              // Lógica condicional para mostrar/ocultar el campo cónyuge
              if (field.name === "spouse_id") {
                const isMarried =
                  personTypeId === "1" || personTypeId === (1 as any);
                if (!isMarried) {
                  return null;
                }
              }

              // Render checkbox fields with their own layout
              if (field.type === "checkbox") {
                return (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name}
                    render={({ field: rhfField }) => (
                      <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-3">
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
                );
              }

              return (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name}
                  render={({ field: rhfField }) => (
                    <FormItem>
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
                                    <span className="truncate">{selectedLabel}</span>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );
            })}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6 pt-4 border-t border-gray-100">
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
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
