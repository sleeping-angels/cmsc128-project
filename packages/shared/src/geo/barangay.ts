import { z } from 'zod';
import { geoMultiPolygon, geoPoint } from '../codecs.js';
import { hazardTypeSchema } from '../enums.js';

export const barangaySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  centroid: geoPoint,
  boundary: geoMultiPolygon.nullable(),
  isCoastal: z.boolean(),
  isUpland: z.boolean(),
  hazards: z.array(hazardTypeSchema),
});
export type Barangay = z.infer<typeof barangaySchema>;
