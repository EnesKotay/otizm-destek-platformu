import api from './api';
import type { ApiResponse } from '@/types';

export interface NutritionFoodData { id: string; childId: string; name: string; accepted: boolean; category: string; createdAt: string; }
export interface NutritionMealData { id: string; childId: string; date: string; mealType: string; foods: string; mood: string; notes: string; createdAt: string; }
export interface DietPreferenceData { id?: string; childId: string; gfcfDiet: boolean; sugarFree: boolean; dairyFree: boolean; glutenFree: boolean; soyFree: boolean; eggFree: boolean; otherDiet: string; notes: string; }

export const nutritionApiService = {
  getFoods: (childId: string) =>
    api.get<ApiResponse<NutritionFoodData[]>>(`/nutrition/foods/${childId}`).then(r => r.data.data),
  addFood: (childId: string, data: { name: string; accepted: boolean; category?: string }) =>
    api.post<ApiResponse<NutritionFoodData>>(`/nutrition/foods/${childId}`, data).then(r => r.data.data),
  deleteFood: (foodId: string) =>
    api.delete(`/nutrition/foods/${foodId}`),

  getMeals: (childId: string) =>
    api.get<ApiResponse<NutritionMealData[]>>(`/nutrition/meals/${childId}`).then(r => r.data.data),
  addMeal: (childId: string, data: { date: string; mealType: string; foods: string[]; mood?: string; notes?: string }) =>
    api.post<ApiResponse<NutritionMealData>>(`/nutrition/meals/${childId}`, data).then(r => r.data.data),
  deleteMeal: (mealId: string) =>
    api.delete(`/nutrition/meals/${mealId}`),

  getDiet: (childId: string) =>
    api.get<ApiResponse<DietPreferenceData>>(`/nutrition/diet/${childId}`).then(r => r.data.data),
  saveDiet: (childId: string, data: Partial<DietPreferenceData>) =>
    api.put<ApiResponse<DietPreferenceData>>(`/nutrition/diet/${childId}`, data).then(r => r.data.data),
};
