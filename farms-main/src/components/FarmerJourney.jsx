import { AlertTriangle, ArrowRight, MapPin, Radar, ShieldCheck, Sprout, Store, Truck } from 'lucide-react';

export default function FarmerJourney({ produce = [], orders = [], onNavigate }) {
  const locationCount = new Set(produce.map((item) => item.location).filter(Boolean)).size;
  const steps = [
    { key: 'land', label: 'LAND', title: 'Your farm base', detail: locationCount ? `${locationCount} recorded farm location${locationCount === 1 ? '' : 's'}` : 'Add a listing with your farm location', target: 'farmer', icon: MapPin },
    { key: 'plan', label: 'PLAN', title: 'Choose what to grow', detail: 'Use crop, soil, water, and weather guidance', target: 'radar', icon: Sprout },
    { key: 'prepare', label: 'PREPARE', title: 'Source farm inputs', detail: 'Seeds, soil care, protection, and irrigation', target: 'inputs', icon: Store },
    { key: 'predict', label: 'PREDICT', title: 'Read demand signals', detail: 'Use tracked demand and inventory signals', target: 'radar', icon: Radar },
    { key: 'sell', label: 'SELL', title: 'Find buyers and markets', detail: 'Compare nearby places, travel, and price signals', target: 'nearby-markets', icon: MapPin },
    { key: 'deliver', label: 'DELIVER', title: 'Track the sale', detail: orders.length ? `${orders.length} order${orders.length === 1 ? '' : 's'} in your connections` : 'Orders and delivery status appear here', target: 'orders', icon: Truck },
    { key: 'recover', label: 'RECOVER', title: 'Protect unsold harvest', detail: 'Use the rescue planner on your farm hub', target: 'rescue', icon: AlertTriangle }
  ];

  const openStep = (step) => {
    if (step.target === 'rescue') {
      document.querySelector('.rescue-tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    onNavigate(step.target);
  };

  return <section className="farmer-journey" aria-labelledby="farmer-journey-title">
    <div className="farmer-journey-heading">
      <div><span className="panel-kicker">FROM BARE LAND TO PROFIT</span><h2 id="farmer-journey-title">Your farm journey</h2><p>One workspace for planning, growing, selling, delivery, and recovery.</p></div>
      <span className="journey-note">Built from your existing farm tools</span>
    </div>
    <div className="journey-steps">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return <button type="button" className="journey-step" key={step.key} onClick={() => openStep(step)}>
          <span className="journey-step-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="journey-step-icon"><Icon size={17} /></span>
          <span className="journey-step-copy"><b>{step.label}</b><strong>{step.title}</strong><small>{step.detail}</small></span>
          <ArrowRight size={16} />
        </button>;
      })}
    </div>
    <button type="button" className="journey-support-link" onClick={() => onNavigate('farmer-help')}><ShieldCheck size={15} /> Need official scheme, insurance, soil, or finance information? Open Farmer Help Desk <ArrowRight size={14} /></button>
  </section>;
}
