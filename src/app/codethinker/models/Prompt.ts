// Структура текстового запроса
export interface Prompt {
  id: string;
  text: string;
  variables: Record<string, string>;
}
