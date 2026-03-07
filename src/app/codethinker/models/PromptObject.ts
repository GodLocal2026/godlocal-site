import { Prompt } from './Prompt';

// Структура объекта промпта с шаблоном
export interface PromptObject {
  prompts: Prompt[];
  template: string;
  // Итоговый текст после интерполяции переменных
  rendered?: string;
}
