import { describe, expect, it } from "vitest";

import { toSentenceCase } from "@/lib/text-format";

describe("toSentenceCase", () => {
  it.each([
    ["Fecha Planificada", "Fecha planificada"],
    ["EQUIPO CATEQUISTA", "Equipo catequista"],
    ["fechaPlanificada", "Fecha planificada"],
    ["fecha_planificada", "Fecha planificada"],
    ["Arquidiócesis/Diócesis", "Arquidiócesis/diócesis"],
    ["Etapa Pre-Bautismal", "Etapa pre-bautismal"],
    ["# Cat.", "# cat."],
    ["3º ESCRUTINIO BAUTISMAL", "3º escrutinio bautismal"],
  ])("convierte %s", (value, expected) => {
    expect(toSentenceCase(value)).toBe(expected);
  });

  it("normaliza espacios y cadenas vacías", () => {
    expect(toSentenceCase("  Fecha   Real  ")).toBe("Fecha real");
    expect(toSentenceCase("   ")).toBe("");
  });
});
