import { getPhones } from '@/lib/sheets/phones'
import { getAllPaidReservations } from '@/lib/sheets/reservations'
import { Phone } from '@/types'

interface SearchParams {
  from?: string | null;
  to?: string | null;
  model?: string | null;
}

export async function getAvailablePhones({ from, to, model }: SearchParams): Promise<Phone[]> {
  // 1. Fetch all data concurrently
  const [allPhones, allReservations] = await Promise.all([
    getPhones(),
    getAllPaidReservations(),
  ]);

  // If no filters are provided, return all active phones
  if (!from && !to && !model) {
    return allPhones;
  }

  // 2. Filter by model if provided
  let availablePhones = allPhones;
  if (model) {
    availablePhones = allPhones.filter(phone => phone.model === model);
  }

  // 3. Filter by date range if provided
  if (from && to) {
    const searchFrom = new Date(from);
    const searchTo = new Date(to);

    // Create a map for quick lookup of reservations by phoneId
    const reservationsByPhoneId = new Map<string, any[]>();
    for (const reservation of allReservations) {
      if (!reservationsByPhoneId.has(reservation.phoneId)) {
        reservationsByPhoneId.set(reservation.phoneId, []);
      }
      reservationsByPhoneId.get(reservation.phoneId)?.push(reservation);
    }

    availablePhones = availablePhones.filter(phone => {
      const phoneReservations = reservationsByPhoneId.get(phone.id);

      if (!phoneReservations) {
        return true; // No reservations for this phone, so it's available
      }
      
      // Check for any overlapping reservation
      return !phoneReservations.some(reservation => {
        const reservationFrom = reservation.from;
        const reservationTo = reservation.to;

        // Overlap condition:
        // (StartA <= EndB) and (EndA >= StartB)
        return searchFrom <= reservationTo && searchTo >= reservationFrom;
      });
    });
  }

  return availablePhones;
} 