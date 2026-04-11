import { HIGH_VALUE_ORDER_THRESHOLD } from "@/lib/constants";

export const projectConfig = {
  highValueOrderThreshold: HIGH_VALUE_ORDER_THRESHOLD,
  plannedCapabilities: [
    "Импорт заказов",
    "Синхронизация данных",
    "Алерты по крупным заказам",
    "Ключевые метрики",
    "Операционный статус"
  ]
} as const;
