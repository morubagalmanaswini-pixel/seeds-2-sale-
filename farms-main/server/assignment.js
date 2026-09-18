const VEHICLE_RECOMMENDATIONS = [
  { vehicle: 'Bike', minKg: 0, maxKg: 20 },
  { vehicle: 'Auto', minKg: 20, maxKg: 300 },
  { vehicle: 'Mini Truck', minKg: 300, maxKg: 1500 },
  { vehicle: 'Truck', minKg: 1500, maxKg: Number.POSITIVE_INFINITY }
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function recommendVehicle(weightKg) {
  const weight = Math.max(0, Number(weightKg) || 0);
  return VEHICLE_RECOMMENDATIONS.find(({ maxKg }) => weight <= maxKg)?.vehicle || 'Truck';
}

export function haversineKm(from, to) {
  if (!from || !to || !Number.isFinite(from.lat) || !Number.isFinite(from.lng) || !Number.isFinite(to.lat) || !Number.isFinite(to.lng)) return Number.POSITIVE_INFINITY;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function defaultTravelEstimate(distanceKm, averageSpeedKph = 25) {
  return Math.max(1, Math.round((distanceKm / averageSpeedKph) * 60));
}

export function scorePartner({ partner, distanceKm, travelTimeMinutes, orderWeightKg, radiusKm }) {
  const distanceScore = clamp(1 - distanceKm / radiusKm);
  const timeScore = clamp(1 - travelTimeMinutes / 120);
  const ratingScore = clamp((Number(partner.rating) || 0) / 5);
  const capacityScore = clamp(Math.min((Number(partner.capacityKg) || 0) / Math.max(orderWeightKg, 1), 2) / 2);
  const workloadScore = clamp(1 - (Number(partner.activeOrders) || 0) / 10);
  const score = distanceScore * 0.3 + timeScore * 0.2 + ratingScore * 0.2 + capacityScore * 0.15 + workloadScore * 0.15;
  return { score: Number(score.toFixed(4)), factors: { distanceScore, timeScore, ratingScore, capacityScore, workloadScore } };
}

export function rankPartners({ order, partners, radiusKm = 15, estimateTravelTime = defaultTravelEstimate }) {
  const weightKg = Math.max(0, Number(order.weightKg) || 0);
  const pickup = order.pickup;
  const destinationText = `${order.serviceArea || ''} ${order.address || ''}`.toLowerCase();
  return partners
    .filter((partner) => partner.available !== false)
    .filter((partner) => !partner.serviceArea || !destinationText || partner.serviceArea.toLowerCase().split(',').some((area) => destinationText.includes(area.trim().toLowerCase())))
    .filter((partner) => (Number(partner.capacityKg) || 0) >= weightKg)
    .map((partner) => {
      const distanceKm = haversineKm(pickup, partner.location);
      const travelTimeMinutes = estimateTravelTime(distanceKm, partner.averageSpeedKph);
      const ranking = scorePartner({ partner, distanceKm, travelTimeMinutes, orderWeightKg: weightKg, radiusKm });
      return { partner, distanceKm: Number(distanceKm.toFixed(2)), travelTimeMinutes, ...ranking };
    })
    .filter((candidate) => candidate.distanceKm <= radiusKm)
    .sort((first, second) => second.score - first.score);
}

export function createAssignment({ order, partners, radiusKm = 15, estimateTravelTime = defaultTravelEstimate }) {
  const rankedCandidates = rankPartners({ order, partners, radiusKm, estimateTravelTime });
  return {
    id: `assignment-${order.id}`,
    orderId: order.id,
    status: rankedCandidates.length ? 'awaiting_partner' : 'unassigned',
    vehicleRecommendation: recommendVehicle(order.weightKg),
    candidates: rankedCandidates,
    currentCandidateIndex: 0,
    assignedPartnerId: null,
    createdAt: new Date().toISOString()
  };
}

export function nextCandidate(assignment) {
  const nextIndex = assignment.currentCandidateIndex + 1;
  if (nextIndex >= assignment.candidates.length) return null;
  return { ...assignment, currentCandidateIndex: nextIndex, status: 'awaiting_partner', assignedPartnerId: null };
}

export { VEHICLE_RECOMMENDATIONS };
