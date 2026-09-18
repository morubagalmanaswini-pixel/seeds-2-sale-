const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buyerRules = {
  Household: { small: 0.06, bulk: 0 },
  Caterer: { small: 0.03, bulk: -0.04 },
  Retailer: { small: 0, bulk: -0.08 },
  Supermarket: { small: 0, bulk: -0.12 }
};

const inferSeasonalFactor = (item, month) => {
  if (Number.isFinite(Number(item.seasonalFactor))) return Number(item.seasonalFactor);
  if (item.category === 'Fruits' && [3, 4, 5].includes(month)) return 0.08;
  if (item.category === 'Flowers' && [9, 10, 11].includes(month)) return 0.06;
  if (item.category === 'Dairy' && [5, 6].includes(month)) return 0.03;
  return 0;
};

const inferWeatherFactor = (item) => {
  if (Number.isFinite(Number(item.weatherDisruption))) return Number(item.weatherDisruption);
  if (item.category === 'Fruits' || item.category === 'Vegetables') return 0.02;
  return 0;
};

const inferTrendFactor = (item) => {
  if (Number.isFinite(Number(item.recentPriceTrend))) return Number(item.recentPriceTrend);
  const farmPrice = Number(item.farmPrice) || 0;
  const marketPrice = Number(item.middlemanPrice) || farmPrice;
  return farmPrice > 0 && marketPrice > farmPrice * 2 ? 0.03 : 0;
};

export function calculateDemandPrice(item, { buyerType = 'Household', quantity = 1, orders = [], distanceKm = 5, now = new Date() } = {}) {
  const basePrice = Math.max(0, Number(item.farmPrice) || 0);
  const available = Math.max(0, Number(item.quantity) || 0);
  const orderedUnits = orders.filter((order) => String(order.name || '').toLowerCase() === String(item.name || '').toLowerCase()).reduce((sum, order) => sum + (Number(order.quantity) || 0), 0);
  const demandRatio = orderedUnits / Math.max(available, 1);
  const demandFactor = clamp(demandRatio * 0.35, 0, 0.12);
  const supplyFactor = available <= 50 ? 0.1 : available <= 150 ? 0.04 : available >= 700 ? -0.08 : 0;
  const qualityFactor = item.organic || item.productionMethod === 'Organic' ? 0.05 : 0;
  const weatherFactor = inferWeatherFactor(item);
  const seasonalFactor = inferSeasonalFactor(item, now.getMonth() + 1);
  const trendFactor = inferTrendFactor(item);
  const transportFactor = clamp((Number(distanceKm) || 0) * 0.004, 0, 0.16);
  const buyerRule = buyerRules[buyerType] || buyerRules.Household;
  const quantityFactor = quantity >= 50 ? buyerRule.bulk : buyerRule.small;
  const factors = [
    { key: 'buyer', label: quantity >= 50 ? `${buyerType} bulk order` : `${buyerType} small order`, value: quantityFactor },
    { key: 'demand', label: demandFactor >= 0.08 ? 'High demand' : demandFactor > 0 ? 'Demand trend' : 'Stable demand', value: demandFactor },
    { key: 'supply', label: supplyFactor > 0 ? 'Low supply' : supplyFactor < 0 ? 'High supply' : 'Balanced supply', value: supplyFactor },
    { key: 'quality', label: qualityFactor ? 'Good quality produce' : 'Standard quality', value: qualityFactor },
    { key: 'weather', label: weatherFactor ? 'Weather disruption risk' : 'Normal weather', value: weatherFactor },
    { key: 'season', label: seasonalFactor ? 'Seasonal change' : 'Regular season', value: seasonalFactor },
    { key: 'trend', label: trendFactor ? 'Recent price trend' : 'Stable recent price', value: trendFactor },
    { key: 'transport', label: `Transport cost (${Math.round(Number(distanceKm) || 0)} km)`, value: transportFactor }
  ];
  const adjustment = factors.reduce((sum, factor) => sum + factor.value, 0);
  const unitPrice = Math.max(1, Math.round(basePrice * (1 + adjustment)));
  return { unitPrice, basePrice, adjustment: Math.round(adjustment * 100), factors: factors.map((factor) => ({ ...factor, percent: Math.round(factor.value * 100) })), demandRatio: Number(demandRatio.toFixed(2)) };
}
