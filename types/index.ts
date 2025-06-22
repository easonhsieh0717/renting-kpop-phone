export interface Phone {
  id: string
  name: string
  model: string
  spec: string
  specs: string[]
  imageUrl: string
  daily_rate_1_2: number
  daily_rate_3_plus: number
  deposit: number
  active: boolean
}

export interface PhonePrice {
  phoneId: string
  date: string
  price: number
}

export interface Reservation {
  id: string
  userInfo: {
    name: string
    phone: string
    email: string
  }
  phoneId: string
  startDate: string
  endDate: string
  bufferDate: string
  totalPrice: number
  paymentStatus: 'paid' | 'pending' | 'failed'
  createdAt: string
} 