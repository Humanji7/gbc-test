import { supabaseAdminFetch } from "@/lib/supabase/server";
import {
  buildDashboardSnapshot,
  type DashboardOrderRow,
  type DashboardSnapshot
} from "./dashboard-snapshot";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const orders = await supabaseAdminFetch<DashboardOrderRow[]>("orders", {
    query: {
      select:
        "external_id,order_number,status,utm_source,city,total_amount,currency,created_at_source,updated_at_source,synced_at",
      order: "updated_at_source.desc.nullslast,created_at_source.desc.nullslast"
    }
  });

  return buildDashboardSnapshot(orders);
}
