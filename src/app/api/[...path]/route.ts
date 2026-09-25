/**
 * Any /api address that is not a route gets a JSON 404, in the same shape
 * as every other API error, instead of the site's HTML not-found page.
 * Real routes are matched first: a catch-all only sees what nothing else
 * claimed.
 */

import { errorResponse } from "@/lib/server/http";

function notFound() {
  return errorResponse(404, "not_found", "There is no API endpoint at this address.");
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
