import { describe, it, expect } from 'vitest';
import { dayRouteUrl, dayRouteLegs, suggestedDayOrder, type SmartRouteItem } from '../src/lib/smart-route';
const item = (id: string, time: string | null, sortOrder: number, pin = true): SmartRouteItem => ({ id, title: id, itemDate: '2026-09-24', itemTime: time, sortOrder, area: 'Dinner', durationMinutes: null, notes: pin ? `Coordinates: 22.28,114.${sortOrder + 10}` : null });
describe('exact day route pins', () => {
 it('keeps imported relative activities in their intended order', () => {
  const rows = [item('hotel', 'After check-in', 0), item('cafe', '15:30-17:15 (if time allows)', 1), item('dinner','17:15 - 18:15',2),item('dragon','18:15',3),item('park','After Fire Dragon',4)];
  expect(suggestedDayOrder([...rows].reverse()).map(x=>x.id)).toEqual(rows.map(x=>x.id));
  const url = new URL(dayRouteUrl(rows, 'walking'));
  expect(url.searchParams.get('origin')).toBe('22.28,114.1');
  expect(url.searchParams.get('destination')).toBe('22.28,114.14');
  expect(url.searchParams.get('waypoints')?.split('|')).toHaveLength(3);
  expect(url.searchParams.get('travelmode')).toBe('walking');
  expect(url.toString()).not.toContain('Dinner');
 });
 it('does not guess or silently skip missing pins', () => {
  const rows=[item('a',null,0),item('b',null,1,false),item('c',null,2)];
  expect(dayRouteUrl(rows,'driving')).toBe('');
  expect(dayRouteLegs(rows,'driving').every(leg=>!leg.url)).toBe(true);
 });
 it('opens every adjacent leg for long days and public transport', () => {
  const rows=Array.from({length:12},(_,i)=>item(String(i),null,i));
  expect(dayRouteUrl(rows,'walking')).toBe('');
  const legs=dayRouteLegs(rows,'transit');
  expect(legs).toHaveLength(11);
  expect(legs.every(leg=>new URL(leg.url).searchParams.get('travelmode')==='transit')).toBe(true);
  expect(dayRouteUrl(rows.slice(0,3),'transit')).toBe('');
 });
 it('rejects map camera positions as destination pins',()=> {
  expect(dayRouteUrl([item('a',null,0),{...item('b',null,1,false),linkUrl:'https://www.google.com/maps/@22.2,114.2,15z'}],'walking')).toBe('');
 });
});
