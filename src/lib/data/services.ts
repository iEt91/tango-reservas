import type { Service } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import {
  createBusinessService as createLocalService,
  deleteBusinessService as deleteLocalService,
  getBusinessServices as getLocalServices,
  setBusinessServiceActive as setLocalServiceActive,
  updateBusinessService as updateLocalService,
} from "@/lib/scheduling";
import {
  createSupabaseService,
  deleteSupabaseService,
  getSupabaseServicesByBusiness,
  getSupabaseServicesByBusinessSync,
  subscribeSupabaseServices,
  setSupabaseServiceActive,
  updateSupabaseService,
} from "@/lib/data/supabase/services";

type ServiceInput = Omit<Service, "id" | "businessId">;

export async function getServicesByBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return getSupabaseServicesByBusiness(businessId);
  }

  return getLocalServices(businessId);
}

export function getServicesByBusinessSync(businessId: string) {
  if (getDataSource() === "supabase") {
    return getSupabaseServicesByBusinessSync(businessId);
  }

  return getLocalServices(businessId);
}

export async function createService(businessId: string, data: ServiceInput) {
  if (getDataSource() === "supabase") {
    return createSupabaseService(businessId, data);
  }

  return createLocalService(businessId, data);
}

export async function updateService(serviceId: string, data: ServiceInput) {
  if (getDataSource() === "supabase") {
    return updateSupabaseService(serviceId, data);
  }

  return updateLocalService(serviceId, data);
}

export async function deleteService(serviceId: string) {
  if (getDataSource() === "supabase") {
    return deleteSupabaseService(serviceId);
  }

  return deleteLocalService(serviceId);
}

export async function setServiceActive(serviceId: string, isActive: boolean) {
  if (getDataSource() === "supabase") {
    return setSupabaseServiceActive(serviceId, isActive);
  }

  return setLocalServiceActive(serviceId, isActive);
}

export function subscribeServices(listener: () => void) {
  if (getDataSource() === "supabase") {
    return subscribeSupabaseServices(listener);
  }

  return () => {};
}
