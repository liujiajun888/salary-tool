import { describe, it, expect } from 'vitest';
import { resolveBase, monthlyInsurance } from '../src/calc/social';
import { CITIES } from '../src/policy';

describe('resolveBase 基数 clamp', () => {
  it('中间值不 clamp', () => expect(resolveBase(30000, null, 7546, 37731)).toBe(30000));
  it('低于下限取下限', () => expect(resolveBase(5000, null, 7546, 37731)).toBe(7546));
  it('高于上限取上限', () => expect(resolveBase(50000, null, 7546, 37731)).toBe(37731));
  it('自定义仍被 clamp', () => expect(resolveBase(30000, 6000, 7546, 37731)).toBe(7546));
});

describe('monthlyInsurance 上海（月薪 30000）', () => {
  const { personal, employer } = monthlyInsurance(CITIES.shanghai, 30000, 30000, 0.07, 0);

  it('个人三险', () => {
    expect(personal.pension).toBe(2400);
    expect(personal.medical).toBe(600);
    expect(personal.unemployment).toBe(150);
    expect(personal.workInjury).toBe(0);
  });
  it('个人公积金', () => {
    expect(personal.hfBasic).toBe(2100);
    expect(personal.hfSupplement).toBe(0);
  });
  it('单位部分', () => {
    expect(employer.pension).toBe(4800);
    expect(employer.medical).toBe(2700);
    expect(employer.unemployment).toBe(150);
    expect(employer.workInjury).toBe(78);
    expect(employer.hfBasic).toBe(2100);
  });
});

describe('monthlyInsurance 杭州（月薪 10000）', () => {
  const { personal, employer } = monthlyInsurance(CITIES.hangzhou, 10000, 10000, 0.12, 0);
  it('个人', () => {
    expect(personal.pension).toBe(800);
    expect(personal.medical).toBe(200);
    expect(personal.unemployment).toBe(50);
    expect(personal.hfBasic).toBe(1200);
  });
  it('单位', () => {
    expect(employer.pension).toBe(1600);
    expect(employer.medical).toBe(950);
    expect(employer.workInjury).toBe(40);
  });
});

describe('舍入精度', () => {
  it('7546 × 7% = 528.22 → 528', () => {
    const { personal } = monthlyInsurance(CITIES.shanghai, 7546, 7546, 0.07, 0);
    expect(personal.hfBasic).toBe(528);
  });
  it('社保真实半分精确进位（3205 × 0.5% = 16.025 → 16.03）', () => {
    const { personal } = monthlyInsurance(CITIES.shanghai, 3205, 3205, 0.07, 0);
    expect(personal.unemployment).toBe(16.03);
  });
});
