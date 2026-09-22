import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const sql=readFileSync('neon-cleanup-keep-all-admins.sql','utf8');
const schema=readFileSync('src/db/schema.ts','utf8');
describe('admin cleanup coverage',()=>{
 it('explicitly covers every application table, including allocations and saved routes',()=>{
  const tables=[...schema.matchAll(/pgTable\(\s*"([^"]+)"/g)].map(match=>match[1]);
  const targetBlock=sql.split('FOREACH table_name IN ARRAY ARRAY[')[1].split('] LOOP')[0];
  const targets=[...targetBlock.matchAll(/'([^']+)'/g)].map(match=>match[1]);
  expect(targets.sort()).toEqual(tables.filter(name=>!['user','account'].includes(name)).sort());
 });
 it('protects admin identities and credentials before deleting within a transaction',()=>{
  expect(sql.indexOf('Cleanup cancelled')).toBeLessThan(sql.indexOf("EXECUTE 'TRUNCATE"));
  expect(sql).toContain("RESTART IDENTITY RESTRICT");
  expect(sql).toContain('DELETE FROM public.account a\nWHERE NOT EXISTS');
  expect(sql).toContain('DELETE FROM public."user" u\nWHERE NOT EXISTS');
  expect(sql).toContain('BEGIN;');expect(sql).toContain('COMMIT;');
 });
});
