import PhoneDetailClient from './client-page'
import { getPhoneById } from '@/lib/sheets/phones'
import { getBookedDates } from '@/lib/sheets/reservations'
import { notFound } from 'next/navigation'

interface PhoneDetailPageProps {
  params: {
    id: string
  }
}

export default async function PhoneDetailPage({ params }: PhoneDetailPageProps) {
  const phone = await getPhoneById(params.id)

  if (!phone) {
    notFound()
  }

  const bookedDates = await getBookedDates(params.id)
  const vercelEnv = process.env.VERCEL_ENV || 'development'

  return <PhoneDetailClient phone={phone} bookedDates={bookedDates} vercelEnv={vercelEnv} />
} 