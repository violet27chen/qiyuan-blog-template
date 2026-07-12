import type { ResourceItem } from '@lib/config/types';
import { fetchResourceCategories, fetchResourceProducts } from '@lib/resources/api';
import type { ResourceCategoryMeta } from '@lib/resources/categories';
import { useCallback, useEffect, useState } from 'react';

interface ResourcesState {
  products: ResourceItem[];
  categories: ResourceCategoryMeta[];
  isLoading: boolean;
  error: string | null;
}

export function useResourcesData(ownerUserId?: string) {
  const [state, setState] = useState<ResourcesState>({
    products: [],
    categories: [],
    isLoading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [products, categories] = await Promise.all([
        fetchResourceProducts({ limit: 200, ownerUserId }),
        fetchResourceCategories({ ownerUserId }),
      ]);
      setState({ products, categories, isLoading: false, error: null });
    } catch (error) {
      setState({
        products: [],
        categories: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load resources',
      });
    }
  }, [ownerUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, retry: load };
}
