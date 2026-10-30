import { z } from 'zod';
import { sexSchema } from '../enums.js';

/** No name field: victim names are never stored (FR9). */
export const victimInputSchema = z.object({
  sex: sexSchema.nullish(),
  age: z.int().min(0).nullish(),
  medicalCondition: z.string().trim().min(1).nullish(),
});
export type VictimInput = z.infer<typeof victimInputSchema>;
