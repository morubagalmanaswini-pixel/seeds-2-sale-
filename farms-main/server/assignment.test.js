import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssignment, nextCandidate, rankPartners, recommendVehicle } from './assignment.js';

const baseOrder = { id: 'order-1', weightKg: 18, pickup: { lat: 17.385, lng: 78.4867 } };
const partners = [
  { id: 'near-bike', name: 'Near Bike', capacityKg: 20, rating: 4, activeOrders: 0, available: true, location: { lat: 17.39, lng: 78.49 } },
  { id: 'far-auto', name: 'Far Auto', capacityKg: 300, rating: 5, activeOrders: 0, available: true, location: { lat: 17.55, lng: 78.65 } },
  { id: 'busy-bike', name: 'Busy Bike', capacityKg: 20, rating: 5, activeOrders: 12, available: true, location: { lat: 17.39, lng: 78.49 } }
];

test('recommends the requested vehicle class from order weight', () => {
  assert.equal(recommendVehicle(20), 'Bike');
  assert.equal(recommendVehicle(20.1), 'Auto');
  assert.equal(recommendVehicle(300), 'Auto');
  assert.equal(recommendVehicle(301), 'Mini Truck');
  assert.equal(recommendVehicle(1501), 'Truck');
});

test('filters by radius, capacity, and availability before ranking', () => {
  const ranked = rankPartners({ order: baseOrder, partners, radiusKm: 20 });
  assert.deepEqual(ranked.map((candidate) => candidate.partner.id), ['near-bike', 'busy-bike']);
  assert.ok(ranked[0].score > ranked[1].score);
});

test('creates an assignment with a ranked fallback queue', () => {
  const assignment = createAssignment({ order: baseOrder, partners: [partners[0], partners[1]], radiusKm: 20 });
  assert.equal(assignment.status, 'awaiting_partner');
  assert.equal(assignment.vehicleRecommendation, 'Bike');
  assert.equal(assignment.candidates.length, 1);
  assert.equal(nextCandidate(assignment), null);
});

test('moves to the next candidate after a decline', () => {
  const assignment = createAssignment({ order: { ...baseOrder, weightKg: 25 }, partners: [partners[1], { ...partners[0], id: 'near-auto', capacityKg: 300 }], radiusKm: 50 });
  assert.equal(assignment.candidates.length, 2);
  const fallback = nextCandidate(assignment);
  assert.equal(fallback.currentCandidateIndex, 1);
  assert.equal(fallback.status, 'awaiting_partner');
});
