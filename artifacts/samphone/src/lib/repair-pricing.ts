export type RepairServiceId =
  | "screen_oled"
  | "screen_lcd"
  | "battery"
  | "charging_port"
  | "back_glass"
  | "camera"
  | "water_damage_diag";

export const REPAIR_SERVICES: {
  id: RepairServiceId;
  labelEn: string;
  labelPt: string;
  baseEuro: number;
}[] = [
  { id: "screen_oled", labelEn: "OLED / premium screen assembly", labelPt: "Ecrã OLED / conjunto premium", baseEuro: 79 },
  { id: "screen_lcd", labelEn: "LCD screen assembly", labelPt: "Ecrã LCD", baseEuro: 49 },
  { id: "battery", labelEn: "Battery replacement", labelPt: "Substituição de bateria", baseEuro: 35 },
  { id: "charging_port", labelEn: "Charging port / flex", labelPt: "Porta de carga / flex", baseEuro: 29 },
  { id: "back_glass", labelEn: "Back glass / housing", labelPt: "Vidro traseiro / carcaça", baseEuro: 45 },
  { id: "camera", labelEn: "Camera module", labelPt: "Módulo de câmara", baseEuro: 42 },
  { id: "water_damage_diag", labelEn: "Water damage diagnostics", labelPt: "Diagnóstico de água", baseEuro: 25 },
];

export function estimateRepairTotal(
  serviceIds: RepairServiceId[],
  urgency: "standard" | "same_day",
): number {
  let sum = 0;
  for (const id of serviceIds) {
    const s = REPAIR_SERVICES.find((x) => x.id === id);
    if (s) sum += s.baseEuro;
  }
  if (urgency === "same_day") sum += 25;
  return Math.round(sum * 100) / 100;
}
