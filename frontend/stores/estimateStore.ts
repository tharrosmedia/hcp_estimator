import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Estimate, EstimateMaterial, EstimateLabor } from '@/lib/shared/types';

interface EstimateState {
  currentEstimate: Partial<Estimate> | null;
  drafts: Partial<Estimate>[];
  pricebook: any[];
  setCurrentEstimate: (est: Partial<Estimate> | null) => void;
  addMaterial: (mat: EstimateMaterial) => void;
  updateMaterial: (index: number, mat: Partial<EstimateMaterial>) => void;
  removeMaterial: (index: number) => void;
  addLabor: (lab: EstimateLabor) => void;
  updateLabor: (index: number, lab: Partial<EstimateLabor>) => void;
  removeLabor: (index: number) => void;
  saveDraft: () => void;
  loadDraft: (id: number) => void;
  setPricebook: (items: any[]) => void;
  reset: () => void;
}

export const useEstimateStore = create<EstimateState>()(
  persist(
    (set, get) => ({
      currentEstimate: null,
      drafts: [],
      pricebook: [],

      setCurrentEstimate: (est) => set({ currentEstimate: est }),

      addMaterial: (mat) => {
        const current = get().currentEstimate || { materials: [], labor: [] };
        set({
          currentEstimate: {
            ...current,
            materials: [...(current.materials || []), mat],
          },
        });
      },

      updateMaterial: (index, mat) => {
        const current = get().currentEstimate;
        if (!current?.materials) return;
        const materials = [...current.materials];
        materials[index] = { ...materials[index], ...mat };
        set({ currentEstimate: { ...current, materials } });
      },

      removeMaterial: (index) => {
        const current = get().currentEstimate;
        if (!current?.materials) return;
        const materials = current.materials.filter((_, i) => i !== index);
        set({ currentEstimate: { ...current, materials } });
      },

      addLabor: (lab) => {
        const current = get().currentEstimate || { materials: [], labor: [] };
        set({
          currentEstimate: {
            ...current,
            labor: [...(current.labor || []), lab],
          },
        });
      },

      updateLabor: (index, lab) => {
        const current = get().currentEstimate;
        if (!current?.labor) return;
        const labor = [...current.labor];
        labor[index] = { ...labor[index], ...lab };
        set({ currentEstimate: { ...current, labor } });
      },

      removeLabor: (index) => {
        const current = get().currentEstimate;
        if (!current?.labor) return;
        const labor = current.labor.filter((_, i) => i !== index);
        set({ currentEstimate: { ...current, labor } });
      },

      saveDraft: () => {
        const { currentEstimate, drafts } = get();
        if (!currentEstimate) return;
        const existingIndex = drafts.findIndex(d => d.id === currentEstimate.id);
        let newDrafts;
        if (existingIndex >= 0) {
          newDrafts = [...drafts];
          newDrafts[existingIndex] = currentEstimate;
        } else {
          newDrafts = [...drafts, { ...currentEstimate, id: Date.now() }];
        }
        set({ drafts: newDrafts });
      },

      loadDraft: (id) => {
        const draft = get().drafts.find(d => d.id === id);
        if (draft) set({ currentEstimate: draft });
      },

      setPricebook: (items) => set({ pricebook: items }),

      reset: () => set({ currentEstimate: null }),
    }),
    {
      name: 'hcp-estimate-drafts',
      partialize: (state) => ({ drafts: state.drafts }),
    }
  )
);
