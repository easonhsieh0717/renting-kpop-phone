import { getPhones } from './sheets/phones'
import { getAllPaidReservations } from './sheets/reservations'
import { Phone } from '../types'
import { formatDateInTaipei } from './utils';

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
  const searchFromStr = formatDateInTaipei(from);
  const searchToStr = formatDateInTaipei(to);

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
      const reservationFromStr = formatDateInTaipei(reservation.from);
      const reservationToStr = formatDateInTaipei(reservation.to);

      // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
      return searchFromStr <= reservationToStr && searchToStr >= reservationFromStr;
    });

    return { ...phone, isAvailable: !isOverlapping };
  });

  return phonesWithAvailability;
} 