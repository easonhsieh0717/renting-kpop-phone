import { getPhones } from './sheets/phones'
import { getAllPaidReservations } from './sheets/reservations'
import { Phone } from '../types'

interface SearchParams {
  from?: string | null;
  to?: string | null;
  model?: string | null;
}

export async function getPhonesWithAvailability({ from, to, model }: SearchParams): Promise<Phone[]> {
  // 1. Fetch all data concurrently
  const [allPhones, allReservations] = await Promise.all([
    getPhones(),
    getAllPaidReservations(),
  ]);

  // If model is provided, pre-filter phones
  const phonesToProcess = model 
    ? allPhones.filter(phone => phone.model === model)
    : allPhones;

  // If no date range is provided, all phones are considered available.
  if (!from || !to) {
    return phonesToProcess.map(phone => ({ ...phone, isAvailable: true }));
  }

  // 3. Determine availability for each phone based on the date range
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

  const phonesWithAvailability = phonesToProcess.map(phone => {
    const phoneReservations = reservationsByPhoneId.get(phone.id);

    if (!phoneReservations) {
      return { ...phone, isAvailable: true }; // No reservations, so it's available
    }
    
    // Check for any overlapping reservation
    const isOverlapping = phoneReservations.some(reservation => {
      const reservationFrom = new Date(reservation.from);
      const reservationTo = new Date(reservation.to);

      // It's crucial to set hours to 0 to compare dates only, ignoring time.
      searchFrom.setHours(0, 0, 0, 0);
      searchTo.setHours(0, 0, 0, 0);
      reservationFrom.setHours(0, 0, 0, 0);
      reservationTo.setHours(0, 0, 0, 0);

      // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
      return searchFrom <= reservationTo && searchTo >= reservationFrom;
    });

    return { ...phone, isAvailable: !isOverlapping };
  });

  return phonesWithAvailability;
} 