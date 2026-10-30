import { Inject, Injectable } from '@nestjs/common';
import type { Barangay, GeoPoint } from '@repo/shared';
import { sql } from 'drizzle-orm';
import type { Database } from '../database/client.js';
import { DB } from '../database/database.module.js';
import { barangay } from '../database/schema/index.js';
import { toEwktPoint } from '../database/schema/columns.js';

/**
 * Reduces a barangay name to a comparable key, ignoring case, accents,
 * punctuation, a "Brgy." prefix and a "(Pob.)" suffix.
 */
export function barangayKey(name: string) {
  return name
    .normalize('NFD')
    .toLowerCase()
    .replace(/^\s*(barangay|brgy|bgy)\b\.?/, '')
    .replace(/\(pob\.?\)|\bpoblacion\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

@Injectable()
export class BarangayService {
  // Barangays change only through migrations, so the name index lives as
  // long as the process.
  private byKey?: Promise<Map<string, Barangay>>;

  constructor(@Inject(DB) private readonly db: Database) {}

  list(): Promise<Barangay[]> {
    return this.db.select().from(barangay).orderBy(barangay.name);
  }

  /** Matches a name as residents or the classifier write it. */
  async findByName(name: string) {
    this.byKey ??= this.list()
      .then((rows) => new Map(rows.map((row) => [barangayKey(row.name), row])))
      .catch((error: unknown) => {
        this.byKey = undefined;
        throw error;
      });
    return (await this.byKey).get(barangayKey(name)) ?? null;
  }

  /** The barangay whose boundary covers `point`, or null outside Miagao. */
  async findContaining(point: GeoPoint): Promise<Barangay | null> {
    const [row] = await this.db
      .select()
      .from(barangay)
      .where(
        sql`ST_Covers(${barangay.boundary}, ${toEwktPoint(point)}::geometry)`,
      )
      .limit(1);
    return row ?? null;
  }
}
