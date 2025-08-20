import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatDate(epochDay: number): string {
  const date = new Date(epochDay * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString('es-ES');
}

export function calculateDaysRemaining(expirationEpochDay: number): number {
  const today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return Math.max(0, expirationEpochDay - today);
}

export function getLicenseStatus(expirationEpochDay: number): 'active' | 'expiring' | 'expired' {
  const daysRemaining = calculateDaysRemaining(expirationEpochDay);
  
  if (daysRemaining === 0) {
    return 'expired';
  } else if (daysRemaining <= 30) {
    return 'expiring';
  }
  
  return 'active';
}
