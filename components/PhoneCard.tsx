'use client'

import { Phone } from '@/types'
import Link from 'next/link'

interface PhoneCardProps {
  phone: Phone
}

export default function PhoneCard({ phone }: PhoneCardProps) {
  return (
    <Link href={`/phones/${phone.id}`} className="group block rounded-lg overflow-hidden transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl">
      <div className="relative w-full h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={phone.imageUrl}
          alt={phone.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-0 transition-opacity duration-300"></div>
      </div>
      <div className="p-5 bg-brand-gray-dark">
        <h3 className="text-xl font-bold text-brand-white truncate group-hover:text-brand-yellow transition-colors duration-300">
          {phone.name}
        </h3>
        <p className="text-brand-gray mt-1">
          {phone.spec}
        </p>
        <div className="mt-4 text-right">
          <span className="text-brand-yellow font-bold text-lg">
            查看詳情 →
          </span>
        </div>
      </div>
    </Link>
  )
} 