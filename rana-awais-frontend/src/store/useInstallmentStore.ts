import { create } from 'zustand';

interface InstallmentDetail {
  installmentNo: number;
  dueDate: string;
  amount: number;
  paid: boolean;
}

interface InstallmentState {
  customerId: string;
  productId: string;
  totalAmount: number;
  downPayment: number;
  numInstallments: number;
  startDate: string;
  gracePeriodDays: number;
  finePerDay: number;
  schedule: InstallmentDetail[];
  setCustomerId: (id: string) => void;
  setProductId: (id: string) => void;
  setTotalAmount: (amt: number) => void;
  setDownPayment: (amt: number) => void;
  setNumInstallments: (n: number) => void;
  setStartDate: (date: string) => void;
  setGracePeriod: (days: number) => void;
  setFinePerDay: (fine: number) => void;
  calculateSchedule: () => void;
  reset: () => void;
}

const generateSchedule = (
  remaining: number,
  months: number,
  start: string
): InstallmentDetail[] => {
  const startDate = new Date(start);
  const installmentAmount = Math.round((remaining / months) * 100) / 100;
  const adjustment = remaining - installmentAmount * months;
  const schedule: InstallmentDetail[] = [];
  for (let i = 0; i < months; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const amount = i === 0 ? installmentAmount + adjustment : installmentAmount;
    schedule.push({
      installmentNo: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: Math.round(amount * 100) / 100,
      paid: false,
    });
  }
  return schedule;
};

export const useInstallmentStore = create<InstallmentState>((set, get) => ({
  customerId: '',
  productId: '',
  totalAmount: 0,
  downPayment: 0,
  numInstallments: 1,
  startDate: new Date().toISOString().split('T')[0],
  gracePeriodDays: 0,
  finePerDay: 0,
  schedule: [],
  setCustomerId: (id) => set({ customerId: id }),
  setProductId: (id) => set({ productId: id }),
  setTotalAmount: (amt) => set({ totalAmount: amt }),
  setDownPayment: (amt) => set({ downPayment: amt }),
  setNumInstallments: (n) => set({ numInstallments: n }),
  setStartDate: (date) => set({ startDate: date }),
  setGracePeriod: (days) => set({ gracePeriodDays: days }),
  setFinePerDay: (fine) => set({ finePerDay: fine }),
  calculateSchedule: () => {
    const { totalAmount, downPayment, numInstallments, startDate } = get();
    const remaining = totalAmount - downPayment;
    if (remaining <= 0 || numInstallments <= 0) {
      set({ schedule: [] });
      return;
    }
    const schedule = generateSchedule(remaining, numInstallments, startDate);
    set({ schedule });
  },
  reset: () =>
    set({
      customerId: '',
      productId: '',
      totalAmount: 0,
      downPayment: 0,
      numInstallments: 1,
      startDate: new Date().toISOString().split('T')[0],
      gracePeriodDays: 0,
      finePerDay: 0,
      schedule: [],
    }),
}));