import { create } from "zustand";

interface SidebarState {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isExpanded: true,
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  toggle: () => set((state) => ({ isExpanded: !state.isExpanded })),
}));
