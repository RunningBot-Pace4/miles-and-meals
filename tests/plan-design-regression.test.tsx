import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { PlannerClient } from '../src/components/PlannerClient';
import { PlanIcon, activityIcon } from '../src/components/PlanIcon';
const props = { countries:[{id:'c',name:'Hong Kong',tripName:'Trip'}], trips:[{id:'t',name:'Trip',financialStatus:'OPEN'}],activeTripId:'t',items:[] };
describe('Plan design regression',()=>{
 it('renders tab icons without legacy theme targets',()=>{
  const html=renderToString(createElement(PlannerClient,props));
  expect(html).toContain('plan-v2-planner-tabs');
  expect(html).not.toMatch(/class="planner-tab(?: |")/);
  expect(html).not.toContain('class="planner-intro"');
  expect(html.match(/<svg /g)?.length).toBeGreaterThanOrEqual(6);
 });
 it('uses visible scalable icons for each section and activity category',()=>{
  for (const kind of ['ITINERARY','PLACE','FOOD','SHOPPING','CHECKLIST','PACKING','STAY','LANDMARK']) {
   expect(renderToString(createElement(PlanIcon,{kind}))).toContain('viewBox="0 0 24 24"');
  }
  expect(activityIcon('ITINERARY','Dinner')).toBe('FOOD');
  expect(activityIcon('ITINERARY','Man Mo Temple')).toBe('LANDMARK');
  expect(activityIcon('ITINERARY','Hotel check-in')).toBe('STAY');
 });
});
