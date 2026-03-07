import { PromptObject } from '../models/PromptObject';

export const jsonUtils = {
  serialize(obj: PromptObject): string {
    return JSON.stringify(obj, null, 2);
  },

  deserialize(json: string): PromptObject {
    try {
      return JSON.parse(json) as PromptObject;
    } catch {
      throw new Error('Invalid PromptObject JSON');
    }
  },
};
