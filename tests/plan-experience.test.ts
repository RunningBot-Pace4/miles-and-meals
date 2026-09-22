import { describe, expect, it } from 'vitest';
import { itineraryDays, scheduledPlace } from '../src/lib/plan-experience';
import { travelItemSchema } from '../src/lib/validation';
import type { PlannerItem } from '../src/lib/planner-types';
const place = { id:'original', countryId:'11111111-1111-4111-8111-111111111111', itemType:'FOOD', title:'Cafe', itemDate:null, sortOrder:0, area:'Central', linkUrl:'https://www.google.com/maps/search/?api=1&query=22.28,114.15', notes:'Coordinates: 22.28,114.15', createdBy:'owner' } as PlannerItem;
describe('Plan experience', () => {
 it('copies a saved place into an activity without its record identity', () => {
  const result=scheduledPlace(place,'2026-09-25','After lunch',[]);
  expect(result).toMatchObject({itemType:'ITINERARY',title:'Cafe',notes:place.notes,linkUrl:place.linkUrl,itemTime:'After lunch'});
  expect(result).not.toHaveProperty('id'); expect(result).not.toHaveProperty('createdBy');
  expect(travelItemSchema.safeParse(result).success).toBe(true);
  expect(place.itemType).toBe('FOOD');
 });
 it('appends to the selected day and trip, excluding other dates or trips', () => {
  const rows=[{...place,itemType:'ITINERARY',itemDate:'2026-09-25',sortOrder:6},{...place,itemType:'ITINERARY',itemDate:'2026-09-26',sortOrder:90},{...place,countryId:'other',itemType:'ITINERARY',itemDate:'2026-09-25',sortOrder:80}];
  expect(scheduledPlace(place,'2026-09-25','',rows).sortOrder).toBe('7');
 });
 it('shows empty trip days and saved dates outside the trip range', () => {
  expect(itineraryDays([{...place,itemType:'ITINERARY',itemDate:'2026-09-28'}],'2026-09-24','2026-09-26')).toEqual(['2026-09-24','2026-09-25','2026-09-26','2026-09-28']);
 });
 it('handles unset and invalid ranges without manufacturing dates', () => {
  expect(itineraryDays([],null,null)).toEqual([]);
  expect(itineraryDays([],'invalid','2026-09-26')).toEqual([]);
 });
});
