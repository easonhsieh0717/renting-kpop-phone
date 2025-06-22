'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Phone } from '../types'

interface PhoneCardProps {
  phone: Phone;
}

export default function PhoneCard({ phone }: PhoneCardProps) {
  const { name, spec, imageUrl, isAvailable } = phone;
  const isSearchMode = typeof isAvailable === 'boolean';
  const isBooked = isSearchMode && !isAvailable;

  return (
    <div className={`relative rounded-lg overflow-hidden shadow-lg bg-brand-gray-medium transition-all duration-300 ${isBooked ? 'opacity-50 grayscale' : 'hover:shadow-brand-yellow/30 hover:scale-105'}`}>
      
      {/* Image Container */}
      <div className="relative w-full h-64">
        <Image
          src={imageUrl}
          alt={name}
          layout="fill"
          objectFit="cover"
        />
        {isBooked && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <p className="text-white text-lg font-bold">此期間已被預約</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-white">{name}</h3>
        <p className="text-sm text-brand-gray-light">{spec}</p>
        
        <div className="mt-4 flex justify-end">
          {isBooked ? (
             <span className="text-brand-gray-light cursor-not-allowed">查看詳情 →</span>
          ) : (
            <Link href={`/phones/${phone.id}`} className="text-brand-yellow font-bold hover:text-yellow-300 transition-colors">
              查看詳情 →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
} 