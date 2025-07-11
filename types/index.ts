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
  highDeposit: number; // 新增高押金欄位
  isAvailable?: boolean
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

export interface Discount {
  code: string;
  type: 'UNIQUE_ONCE' | 'FIXED' | 'PER_DAY';
  value: number;
  isActive: boolean;
  minDays?: number;
  description?: string;
} 