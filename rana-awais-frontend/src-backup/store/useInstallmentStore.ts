import { create } from 'zustand';

// ✅ Types
export interface InstallmentDetail {
  installmentNo: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  partialPaid?: number;
  remaining?: number;
  fine?: number;
  paidDate?: string;
  collectedBy?: string;
  collectedById?: string;
  remarks?: string;
}

export interface InstallmentPlan {
  id?: string;
  customerId: string;
  productId: string;
  inventoryItemId?: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  numInstallments: number;
  installmentAmount: number;
  startDate: string;
  endDate: string;
  gracePeriodDays: number;
  finePerDay: number;
  status?: 'active' | 'completed' | 'defaulted' | 'overdue';
  createdBy?: string;
  schedule: InstallmentDetail[];
  // Product details
  serialNumber?: string;
  imei?: string;
  engineNo?: string;
  chassisNo?: string;
  model?: string;
  color?: string;
  company?: string;
  // Additional fields
  advanceAmount?: number;
  advanceReceived?: number;
  processFee?: number;
  discount?: number;
  salaryIncome?: number;
  defaulter?: string;
  pto?: string;
  vpnStatus?: string;
  employeeStatus?: string;
  dbmRemarks?: string;
  crcRemarks?: string;
  processAt?: string;
  doOfficer?: string;
  markOff?: string;
  debtMng?: string;
  secondMng?: string;
  inspOff?: string;
  srm?: string;
  mobilePhone?: string;
  crc?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface InstallmentState {
  // Plan data
  plan: InstallmentPlan;
  // UI state
  isCalculating: boolean;
  error: string | null;
  // Actions
  setCustomerId: (id: string) => void;
  setProductId: (id: string) => void;
  setInventoryItemId: (id: string) => void;
  setTotalAmount: (amt: number) => void;
  setDownPayment: (amt: number) => void;
  setNumInstallments: (n: number) => void;
  setInstallmentAmount: (amt: number) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setGracePeriod: (days: number) => void;
  setFinePerDay: (fine: number) => void;
  setStatus: (status: InstallmentPlan['status']) => void;
  setCreatedBy: (name: string) => void;
  setProductDetails: (details: Partial<InstallmentPlan>) => void;
  setAdditionalFields: (fields: Partial<InstallmentPlan>) => void;
  setSchedule: (schedule: InstallmentDetail[]) => void;
  updateInstallment: (index: number, data: Partial<InstallmentDetail>) => void;
  calculateSchedule: () => void;
  reset: () => void;
  clearError: () => void;
  loadPlan: (plan: Partial<InstallmentPlan>) => void;
}

// ✅ Generate schedule with proper calculations
const generateSchedule = (
  remaining: number,
  months: number,
  start: string,
  installmentAmount?: number
): InstallmentDetail[] => {
  if (remaining <= 0 || months <= 0) return [];

  const startDate = new Date(start);
  let perInstallment: number;

  if (installmentAmount && installmentAmount > 0) {
    perInstallment = installmentAmount;
  } else {
    perInstallment = Math.round((remaining / months) * 100) / 100;
  }

  const totalCalculated = perInstallment * months;
  const adjustment = Math.round((remaining - totalCalculated) * 100) / 100;

  const schedule: InstallmentDetail[] = [];
  let totalAllocated = 0;

  for (let i = 0; i < months; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    let amount = perInstallment;
    if (i === months - 1) {
      // Last installment gets the adjustment
      amount = Math.round((remaining - totalAllocated) * 100) / 100;
    }
    totalAllocated += amount;

    schedule.push({
      installmentNo: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: Math.round(amount * 100) / 100,
      paid: false,
      partialPaid: 0,
      remaining: Math.round(amount * 100) / 100,
      fine: 0,
    });
  }

  return schedule;
};

// ✅ Default plan
const defaultPlan: InstallmentPlan = {
  customerId: '',
  productId: '',
  totalAmount: 0,
  downPayment: 0,
  remainingAmount: 0,
  numInstallments: 1,
  installmentAmount: 0,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  gracePeriodDays: 0,
  finePerDay: 0,
  status: 'active',
  schedule: [],
};

// ✅ Create store WITHOUT persist middleware to avoid infinite re-render loops
export const useInstallmentStore = create<InstallmentState>()((set, get) => ({
  plan: { ...defaultPlan },
  isCalculating: false,
  error: null,

  // ✅ Setters
  setCustomerId: (id: string) => {
    set(state => ({
      plan: { ...state.plan, customerId: id }
    }));
  },

  setProductId: (id: string) => {
    set(state => ({
      plan: { ...state.plan, productId: id }
    }));
  },

  setInventoryItemId: (id: string) => {
    set(state => ({
      plan: { ...state.plan, inventoryItemId: id }
    }));
  },

  setTotalAmount: (amt: number) => {
    set(state => {
      const plan = { ...state.plan, totalAmount: amt };
      plan.remainingAmount = amt - plan.downPayment;
      return { plan };
    });
  },

  setDownPayment: (amt: number) => {
    set(state => {
      const plan = { ...state.plan, downPayment: amt };
      plan.remainingAmount = plan.totalAmount - amt;
      return { plan };
    });
  },

  setNumInstallments: (n: number) => {
    set(state => ({
      plan: { ...state.plan, numInstallments: n }
    }));
  },

  setInstallmentAmount: (amt: number) => {
    set(state => ({
      plan: { ...state.plan, installmentAmount: amt }
    }));
  },

  setStartDate: (date: string) => {
    set(state => ({
      plan: { ...state.plan, startDate: date }
    }));
  },

  setEndDate: (date: string) => {
    set(state => ({
      plan: { ...state.plan, endDate: date }
    }));
  },

  setGracePeriod: (days: number) => {
    set(state => ({
      plan: { ...state.plan, gracePeriodDays: days }
    }));
  },

  setFinePerDay: (fine: number) => {
    set(state => ({
      plan: { ...state.plan, finePerDay: fine }
    }));
  },

  setStatus: (status: InstallmentPlan['status']) => {
    set(state => ({
      plan: { ...state.plan, status }
    }));
  },

  setCreatedBy: (name: string) => {
    set(state => ({
      plan: { ...state.plan, createdBy: name }
    }));
  },

  setProductDetails: (details: Partial<InstallmentPlan>) => {
    set(state => ({
      plan: { ...state.plan, ...details }
    }));
  },

  setAdditionalFields: (fields: Partial<InstallmentPlan>) => {
    set(state => ({
      plan: { ...state.plan, ...fields }
    }));
  },

  setSchedule: (schedule: InstallmentDetail[]) => {
    set(state => ({
      plan: { ...state.plan, schedule }
    }));
  },

  updateInstallment: (index: number, data: Partial<InstallmentDetail>) => {
    set(state => {
      const schedule = [...state.plan.schedule];
      if (index >= 0 && index < schedule.length) {
        schedule[index] = { ...schedule[index], ...data };
      }
      return {
        plan: { ...state.plan, schedule }
      };
    });
  },

  // ✅ Calculate schedule
  calculateSchedule: () => {
    const { plan } = get();
    const { totalAmount, downPayment, numInstallments, startDate, installmentAmount } = plan;
    
    const remaining = totalAmount - downPayment;
    
    if (remaining <= 0 || numInstallments <= 0) {
      set({ 
        plan: { ...plan, schedule: [], remainingAmount: 0 },
        error: 'Remaining amount or number of installments is invalid'
      });
      return;
    }

    set({ isCalculating: true, error: null });

    try {
      const schedule = generateSchedule(remaining, numInstallments, startDate, installmentAmount);
      const endDate = schedule.length > 0 ? schedule[schedule.length - 1].dueDate : startDate;
      
      set({
        plan: {
          ...plan,
          remainingAmount: remaining,
          schedule,
          endDate,
          installmentAmount: schedule.length > 0 ? schedule[0].amount : 0,
        },
        isCalculating: false,
      });
    } catch (error) {
      set({
        error: 'Failed to calculate schedule',
        isCalculating: false,
      });
    }
  },

  // ✅ Reset
  reset: () => {
    set({
      plan: { ...defaultPlan, startDate: new Date().toISOString().split('T')[0] },
      isCalculating: false,
      error: null,
    });
  },

  // ✅ Clear error
  clearError: () => {
    set({ error: null });
  },

  // ✅ Load plan
  loadPlan: (planData: Partial<InstallmentPlan>) => {
    set(state => ({
      plan: { ...state.plan, ...planData }
    }));
  },
}));

// ✅ Helper hooks
export const useInstallmentPlan = () => useInstallmentStore((state) => state.plan);
export const useInstallmentSchedule = () => useInstallmentStore((state) => state.plan.schedule);
export const useInstallmentCalculating = () => useInstallmentStore((state) => state.isCalculating);
export const useInstallmentError = () => useInstallmentStore((state) => state.error);

// ✅ Utility functions
export const getTotalInstallmentAmount = (schedule: InstallmentDetail[]): number => {
  return schedule.reduce((sum, inst) => sum + inst.amount, 0);
};

export const getPaidInstallments = (schedule: InstallmentDetail[]): InstallmentDetail[] => {
  return schedule.filter(inst => inst.paid);
};

export const getPendingInstallments = (schedule: InstallmentDetail[]): InstallmentDetail[] => {
  return schedule.filter(inst => !inst.paid);
};

export const getTotalPaidAmount = (schedule: InstallmentDetail[]): number => {
  return schedule.reduce((sum, inst) => sum + (inst.partialPaid || 0), 0);
};

export const getTotalRemainingAmount = (schedule: InstallmentDetail[]): number => {
  return schedule.reduce((sum, inst) => sum + (inst.remaining || inst.amount || 0), 0);
};

export default useInstallmentStore;
