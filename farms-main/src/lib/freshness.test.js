import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProduceScan, calculateAiFreshnessScore, isFreshnessPublishEligible } from './freshness.js';

test('freshness score can pass publication when it meets the 75/100 minimum', () => {
  const score = calculateAiFreshnessScore({
    pickedStatus: 'Picked just now',
    productionMethod: 'Organic',
    expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    photo: 'data:image/png;base64,abc123'
  });

  assert.ok(score >= 75);
  assert.equal(isFreshnessPublishEligible({
    pickedStatus: 'Picked just now',
    productionMethod: 'Organic',
    expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    photo: 'data:image/png;base64,abc123'
  }), true);
});

test('spoiled or expired vegetables are rejected immediately', () => {
  const score = calculateAiFreshnessScore({
    pickedStatus: 'Picked just now',
    productionMethod: 'Organic',
    expiryDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    photo: 'data:image/png;base64,abc123'
  });

  assert.equal(score, 0);
  assert.equal(isFreshnessPublishEligible({
    pickedStatus: 'Picked just now',
    productionMethod: 'Organic',
    expiryDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    photo: 'data:image/png;base64,abc123'
  }), false);
});

test('fungus or spoilage keywords trigger automatic rejection', () => {
  const candidate = {
    pickedStatus: 'Picked just now',
    productionMethod: 'Organic',
    expiryDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    photo: 'data:image/png;base64,abc123',
    name: 'Tomato',
    description: 'Showing mold and soft rotten patches on the surface'
  };

  assert.equal(calculateAiFreshnessScore(candidate), 0);
  assert.equal(isFreshnessPublishEligible(candidate), false);
});

test('common mold and decay wording is rejected by the safety scan', async () => {
  const result = await analyzeProduceScan({
    pickedStatus: 'Picked just now',
    productionMethod: 'Organic',
    expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    name: 'Tomatoes',
    description: 'Mouldy fruit with fuzzy green growth and a foul smell',
    photo: ''
  });

  assert.equal(result.rejected, true);
  assert.equal(result.score, 0);
});
