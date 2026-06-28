import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../utils/api';

export interface UpcomingInstallment {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_urdu?: string;
  father_name?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  address_urdu?: string;
  product_name: string;
  product_name_urdu?: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid: boolean;
  partial_paid?: number;
  paid_date?: string;
  remaining_installments?: number;
  total_installments?: number;
  collected_by?: string;
}

interface UseInstallmentsReturn {
  data: UpcomingInstallment[];
  loading: boolean;
  error: string | null;
  fetchUpcoming: (days: number) => Promise<void>;
  clearData: () => void;
  refresh: () => Promise<void>;
}

export const useInstallments = (): UseInstallmentsReturn => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  
  const [data, setData] = useState<UpcomingInstallment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDays, setLastDays] = useState<number>(7);

  const fetchUpcoming = useCallback(async (days = 7) => {
    if (days <= 0) {
      const errorMsg = isUrdu ? 'دنوں کی تعداد مثبت ہونی چاہیے' : 'Days must be greater than 0';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    setLastDays(days);

    try {
      const res = await api.get(`/installments/upcoming?days=${days}`);
      const responseData = res.data || [];
      setData(Array.isArray(responseData) ? responseData : []);
      
      if (Array.isArray(responseData) && responseData.length === 0) {
        const infoMsg = isUrdu ? 'کوئی آنے والی قسط نہیں' : 'No upcoming installments found';
        toast(infoMsg);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'قسطیں لوڈ کرنے میں ناکامی' : t('error_loading_installments'));
      setError(errorMsg);
      toast.error(errorMsg);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [t, isUrdu]);

  const clearData = useCallback(() => {
    setData([]);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    await fetchUpcoming(lastDays);
  }, [fetchUpcoming, lastDays]);

  return {
    data,
    loading,
    error,
    fetchUpcoming,
    clearData,
    refresh,
  };
};

export default useInstallments;