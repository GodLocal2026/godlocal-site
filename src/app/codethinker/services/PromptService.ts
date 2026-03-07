import { Prompt } from '../models/Prompt';
import { PromptObject } from '../models/PromptObject';

export class PromptService {
  private prompts: Prompt[] = [];

  addPrompt(prompt: Prompt): void {
    this.prompts.push(prompt);
  }

  getPrompts(): Prompt[] {
    return this.prompts;
  }

  /**
   * Интерполирует переменные в шаблон.
   * Пример: template = "Ты помогаешь с {{topic}}. Стиль: {{style}}."
   *         variables = { topic: "медитацией", style: "кратко" }
   *         result   = "Ты помогаешь с медитацией. Стиль: кратко."
   */
  renderPrompt(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] ?? `{{${key}}}`;
    });
  }

  /**
   * Собирает PromptObject и рендерит итоговый текст
   * из первого промпта + шаблона.
   */
  generatePromptObject(template: string): PromptObject {
    const prompts = this.getPrompts();
    const firstPrompt = prompts[0];
    const rendered = firstPrompt
      ? this.renderPrompt(template, firstPrompt.variables)
      : template;
    return { prompts, template, rendered };
  }
}
