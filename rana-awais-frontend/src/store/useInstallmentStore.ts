import { create } from 'zustand';
import { roundMoney } from '../utils/math';
import { undoMiddleware } from './undoMiddleware';

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

// Undo/Redo interface added by middleware
export interface UndoRedoActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
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

// Full store type including undo/redo
export type FullInstallmentState = InstallmentState & UndoRedoActions;

// ✅ Generate schedule with proper calculations using math utility
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
    perInstallment = roundMoney(remaining / months);
  }

  const totalCalculated = perInstallment * months;
  const adjustment = roundMoney(remaining - totalCalculated);

  const schedule: InstallmentDetail[] = [];
  let totalAllocated = 0;

  for (let i = 0; i < months; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    let amount = perInstallment;
    if (i === months - 1) {
      // Last installment gets the adjustment
      amount = roundMoney(remaining - totalAllocated);
    }
    totalAllocated += amount;

    schedule.push({
      installmentNo: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: roundMoney(amount),
      paid: false,
      partialPaid: 0,
      remaining: roundMoney(amount),
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

// ✅ Create store with undo/redo middleware
export const useInstallmentStore = create<any>()(
  undoMiddleware(
    (set, get) => ({
      plan: { ...defaultPlan },
      isCalculating: false,
      error: null,

      // ✅ Setters
      setCustomerId: (id: string) => {
        set((state: any) => ({
          plan: { ...state.plan, customerId: id }
        }));
      },

      setProductId: (id: string) => {
        set((state: any) => ({
          plan: { ...state.plan, productId: id }
        }));
      },

      setInventoryItemId: (id: string) => {
        set((state: any) => ({
          plan: { ...state.plan, inventoryItemId: id }
        }));
      },

      setTotalAmount: (amt: number) => {
        set((state: any) => {
          const plan = { ...state.plan, totalAmount: amt };
          plan.remainingAmount = roundMoney(amt - plan.downPayment);
          return { plan };
        });
      },

      setDownPayment: (amt: number) => {
        set((state: any) => {
          const plan = { ...state.plan, downPayment: amt };
          plan.remainingAmount = roundMoney(plan.totalAmount - amt);
          return { plan };
        });
      },

      setNumInstallments: (n: number) => {
        set((state: any) => ({
          plan: { ...state.plan, numInstallments: n }
        }));
      },

      setInstallmentAmount: (amt: number) => {
        set((state: any) => ({
          plan: { ...state.plan, installmentAmount: amt }
        }));
      },

      setStartDate: (date: string) => {
        set((state: any) => ({
          plan: { ...state.plan, startDate: date }
        }));
      },

      setEndDate: (date: string) => {
        set((state: any) => ({
          plan: { ...state.plan, endDate: date }
        }));
      },

      setGracePeriod: (days: number) => {
        set((state: any) => ({
          plan: { ...state.plan, gracePeriodDays: days }
        }));
      },

      setFinePerDay: (fine: number) => {
        set((state: any) => ({
          plan: { ...state.plan, finePerDay: fine }
        }));
      },

      setStatus: (status: InstallmentPlan['status']) => {
        set((state: any) => ({
          plan: { ...state.plan, status }
        }));
      },

      setCreatedBy: (name: string) => {
        set((state: any) => ({
          plan: { ...state.plan, createdBy: name }
        }));
      },

      setProductDetails: (details: Partial<InstallmentPlan>) => {
        set((state: any) => ({
          plan: { ...state.plan, ...details }
        }));
      },

      setAdditionalFields: (fields: Partial<InstallmentPlan>) => {
        set((state: any) => ({
          plan: { ...state.plan, ...fields }
        }));
      },

      setSchedule: (schedule: InstallmentDetail[]) => {
        set((state: any) => ({
          plan: { ...state.plan, schedule }
        }));
      },

      updateInstallment: (index: number, data: Partial<InstallmentDetail>) => {
        set((state: any) => {
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
        
        const remaining = roundMoney(totalAmount - downPayment);
        
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
        set((state: any) => ({
          plan: { ...state.plan, ...planData }
        }));
      },
    }),
    { maxHistory: 50 }
  )
);

// ✅ Helper hooks
export const useInstallmentPlan = () => useInstallmentStore((state: any) => state.plan);
export const useInstallmentSchedule = () => useInstallmentStore((state: any) => state.plan.schedule);
export const useInstallmentCalculating = () => useInstallmentStore((state: any) => state.isCalculating);
export const useInstallmentError = () => useInstallmentStore((state: any) => state.error);

// ✅ Utility functions
export const getTotalInstallmentAmount = (schedule: InstallmentDetail[]): number => {
  return roundMoney(schedule.reduce((sum, inst) => sum + inst.amount, 0));
};

export const getPaidInstallments = (schedule: InstallmentDetail[]): InstallmentDetail[] => {
  return schedule.filter(inst => inst.paid);
};

export const getPendingInstallments = (schedule: InstallmentDetail[]): InstallmentDetail[] => {
  return schedule.filter(inst => !inst.paid);
};

export const getTotalPaidAmount = (schedule: InstallmentDetail[]): number => {
  return roundMoney(schedule.reduce((sum, inst) => sum + (inst.partialPaid || 0), 0));
};

export const getTotalRemainingAmount = (schedule: InstallmentDetail[]): number => {
  return roundMoney(schedule.reduce((sum, inst) => {
    // Only count remaining for unpaid installments
    if (inst.paid) return sum;
    // Use explicit remaining value; fallback to (amount - partialPaid) if remaining is undefined
    const remaining = inst.remaining !== undefined ? inst.remaining : (inst.amount - (inst.partialPaid || 0));
    return sum + Math.max(0, remaining);
  }, 0));
};

export default useInstallmentStore;
