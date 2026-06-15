import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../utils/api';

export interface UpcomingInstallment {
  id: string;
  customer_name: string;
  customer_urdu: string;
  product_name: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid: boolean;
}

export const useInstallments = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<UpcomingInstallment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUpcoming = async (days: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/installments/upcoming?days=${days}`);
      setData(res.data || []);
    } catch (err) {
      toast.error(t('error_loading_installments'));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, fetchUpcoming };
};