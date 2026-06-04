import { vi } from "vitest";

vi.mock("../hooks/useCatalogTranslations", () => ({
  getTranslationFromCache: () => null,
  useCatalogTranslations: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));
