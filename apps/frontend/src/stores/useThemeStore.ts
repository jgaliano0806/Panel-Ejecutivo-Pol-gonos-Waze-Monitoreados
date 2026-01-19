import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  // Lógica de inicialización
  const saved = localStorage.getItem("theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialDark = saved ? saved === "dark" : systemDark;

  // Aplicar efecto secundario inicial
  if (initialDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  return {
    isDark: initialDark,
    toggleTheme: () =>
      set((state) => {
        const newDark = !state.isDark;

        // Efectos secundarios
        if (newDark) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }

        return { isDark: newDark };
      }),
  };
});
