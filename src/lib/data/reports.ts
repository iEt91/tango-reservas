import type { Reservation } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import {
  buildReportData as buildLocalReportData,
  buildReportDateRange,
  formatCurrency,
  formatPercent,
  formatShortDate,
  getCustomerReportStats,
  getEstimatedRevenue,
  getOperationalAlerts,
  getReportReservations,
  getReportStats,
  getServiceStats,
  getTableReportStats,
  getTimeSlotStats,
  getWeekdayStats,
  type ReportData,
  type ReportPeriod,
} from "@/lib/reports";
import { getSupabaseReportDataByBusiness } from "@/lib/data/supabase/reports";

export type { ReportData, ReportPeriod };

export {
  buildReportDateRange,
  formatCurrency,
  formatPercent,
  formatShortDate,
  getCustomerReportStats,
  getEstimatedRevenue,
  getOperationalAlerts,
  getReportReservations,
  getReportStats,
  getServiceStats,
  getTableReportStats,
  getTimeSlotStats,
  getWeekdayStats,
};

type BuildReportDataParams = {
  businessId: string;
  reservations: Reservation[];
  range: ReportData["range"];
  now?: Date;
};

export function buildReportData({
  businessId,
  reservations,
  range,
  now = new Date(),
}: BuildReportDataParams): ReportData {
  if (getDataSource() === "supabase") {
    return getSupabaseReportDataByBusiness(businessId, { range, now });
  }

  return buildLocalReportData({
    businessId,
    reservations,
    range,
    now,
  });
}
