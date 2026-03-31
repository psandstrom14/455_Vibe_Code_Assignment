import "server-only";
import { cookies } from "next/headers";

const ACTIVE_CUSTOMER_COOKIE = "active_customer_id";

export async function getActiveCustomerId() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_CUSTOMER_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function setActiveCustomerId(customerId: number) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CUSTOMER_COOKIE, String(customerId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearActiveCustomerId() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_CUSTOMER_COOKIE);
}
