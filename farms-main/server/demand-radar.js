const DEFAULT_CITIES = [
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const normalize = (value) => String(value || '').trim().toLowerCase();
const cityFor = (item) => DEFAULT_CITIES.find((city) => normalize(item.location).includes(normalize(city.state)) || normalize(item.location).includes(normalize(city.name))) || DEFAULT_CITIES[0];

export function analyzeDemand({ produce = [], orders = [], query = '' } = {}) {
  const demand = new Map();
  for (const item of produce) {
    const city = cityFor(item);
    const key = `${city.name}:${normalize(item.name)}`;
    demand.set(key, { city, name: item.name, state: city.state, unitsAvailable: Number(item.quantity) || 0, orders: 0, volume: 0, farmPrice: Number(item.farmPrice) || 0 });
  }
  for (const order of orders) {
    const name = normalize(order.name);
    const city = cityFor(order);
    const existing = [...demand.values()].find((signal) => normalize(signal.name) === name && signal.city.name === city.name);
    const signal = existing || { city, name: order.name || 'Unknown produce', state: city.state, unitsAvailable: 0, orders: 0, volume: 0, farmPrice: 0 };
    signal.orders += 1;
    signal.volume += Number(order.quantity) || 0;
    demand.set(`${city.name}:${normalize(signal.name)}`, signal);
  }
  const signals = [...demand.values()].map((signal) => {
    const pressure = clamp(Math.round(50 + signal.orders * 12 + signal.volume * 2 - Math.min(signal.unitsAvailable, 100) * 0.08), 1, 99);
    return { ...signal, score: pressure, change: `${pressure >= 70 ? '+' : ''}${pressure - 50}%`, level: pressure >= 70 ? 'high' : pressure >= 45 ? 'medium' : 'low', evidence: `${signal.orders} order${signal.orders === 1 ? '' : 's'} and ${signal.volume} unit${signal.volume === 1 ? '' : 's'} observed` };
  }).sort((first, second) => second.score - first.score);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const filtered = terms.length ? signals.filter((signal) => terms.every((term) => [signal.name, signal.city.name, signal.state].some((value) => normalize(value).includes(term)))) : signals;
  const result = filtered.length ? filtered : signals;
  return { generatedAt: new Date().toISOString(), source: 'orders-and-inventory', model: 'FarmDirect demand pressure model', query, signals: result.slice(0, 20), trackedMarkets: new Set(result.map((signal) => signal.city.name)).size, signalsAnalyzed: result.length };
}

export { DEFAULT_CITIES };
