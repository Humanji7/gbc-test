import { CURRENT_MILESTONE, HIGH_VALUE_ORDER_THRESHOLD } from "@/lib/constants";

export const projectConfig = {
  currentMilestone: CURRENT_MILESTONE,
  highValueOrderThreshold: HIGH_VALUE_ORDER_THRESHOLD,
  plannedCapabilities: [
    "Импорт заказов",
    "Синхронизация данных",
    "Алерты по крупным заказам",
    "Ключевые метрики"
  ]
} as const;
