"use client"

import { useParams } from "next/navigation"
import { TripDetailScreen } from "./TripDetailScreen"

/** Reads the dynamic segment on the client (keeps the route shell static). */
export function TripDetailRoute() {
  const { tripId } = useParams<{ tripId: string }>()
  return <TripDetailScreen key={tripId} tripId={tripId} />
}
