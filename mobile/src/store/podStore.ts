import { create } from 'zustand';
import { Pod, DriverLocation } from '../types';
import { fetchUpcomingPods, getErrorMessage } from '../services/api';

interface PodState {
  pods: Pod[];
  isLoading: boolean;
  error: string | null;
  activePod: Pod | null;
  driverLocation: DriverLocation | null;
  loadPods: () => Promise<void>;
  setActivePod: (pod: Pod | null) => void;
  setDriverLocation: (location: DriverLocation | null) => void;
}

export const usePodStore = create<PodState>(set => ({
  pods: [],
  isLoading: false,
  error: null,
  activePod: null,
  driverLocation: null,

  loadPods: async () => {
    set({ isLoading: true, error: null });
    try {
      const pods = await fetchUpcomingPods();
      set({ pods, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error),
      });
    }
  },

  setActivePod: pod => set({ activePod: pod }),
  setDriverLocation: location => set({ driverLocation: location }),
}));
