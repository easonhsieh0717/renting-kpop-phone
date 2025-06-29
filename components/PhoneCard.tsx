'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Phone } from '../types'

interface PhoneCardProps {
  phone: Phone
}

export default function PhoneCard({ phone }: PhoneCardProps) {
  const { id, name, spec, imageUrl, isAvailable } = phone;
  const isSearchMode = typeof isAvailable === 'boolean';
  const isBooked = isSearchMode && !isAvailable;

  const CardContent = (
    <>
      {/* Image Container */}
      <div className="relative w-full h-64">
        <Image
          src={imageUrl}
          alt={`${name} 手機租借 - 好星機好心情演唱會追星專用 ${spec}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          loading="lazy"
        />
        {isBooked && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <p className="text-white text-lg font-bold">此期間已被預約</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-white truncate">{name}</h3>
        <p className="text-sm text-brand-gray-light">{spec}</p>
        
        <div className="mt-4 flex justify-end">
          <span className={`font-bold transition-colors ${isBooked ? 'text-brand-gray-light cursor-not-allowed' : 'text-brand-yellow group-hover:text-yellow-300'}`}>
            查看詳情 →
          </span>
        </div>
      </div>
    </>
  );

  if (isBooked) {
    return (
      <div className="relative rounded-lg overflow-hidden shadow-lg bg-brand-gray-medium opacity-50 grayscale">
        {CardContent}
      </div>
    );
  }

  return (
    <Link href={`/phones/${id}`} className="group block rounded-lg overflow-hidden shadow-lg bg-brand-gray-medium transition-all duration-300 hover:shadow-brand-yellow/30 hover:scale-105">
      {CardContent}
    </Link>
  );
} 