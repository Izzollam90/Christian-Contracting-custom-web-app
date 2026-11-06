import { useCallback, useEffect, useState } from 'react';
import { useRealtime } from '@herkey/shared';
import { fetchStaffData, type StaffData } from './data';

const EMPTY: StaffData = {
  jobs: [], board: [], customers: [], profiles: [], activity: [],
  estimates: [], estimateLines: [], invoices: [], invoiceLines: [], expenses: [], time: [],
};

export function useStaffData() {
  const [data, setData] = useState<StaffData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setData(await fetchStaffData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useRealtime('jobs', null, () => void reload());
  useRealtime('job_board', null, () => void reload());
  useRealtime('activity_log', null, () => void reload());
  useRealtime('estimates', null, () => void reload());
  useRealtime('invoices', null, () => void reload());
  useRealtime('expenses', null, () => void reload());
  useRealtime('time_entries', null, () => void reload());
  useRealtime('profiles', null, () => void reload());

  return { data, loading, reload };
}
