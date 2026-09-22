import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { PlanSheet } from '../src/components/PlanSheet';
describe('Plan mobile editor', () => {
 it('can be server rendered before the browser document exists', () => {
  expect(() => renderToString(createElement(PlanSheet, {title:'Add plan', onClose:()=>{}, children:'Editor'}))).not.toThrow();
 });
});
