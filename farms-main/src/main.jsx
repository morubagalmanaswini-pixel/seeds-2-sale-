function QualityVerification({ order, role, onUpdate }) {
  const verification = order.qualityVerification || { method: qualityMethod(order), farmer: { verified: false }, buyer: { verified: false } };
  const method = verification.method || 'Conventional';
  const checks = qualityChecks[method] || qualityChecks.Conventional;
  const isFarmer = role === 'farmer';
  const completed = isFarmer ? verification.farmer?.verified : verification.buyer?.verified;
  const canVerify = isFarmer ? !verification.farmer?.verified : verification.farmer?.verified && !verification.buyer?.verified;
  const verify = () => { if (!canVerify) return; const now = new Date().toISOString(); onUpdate(order.id, { qualityVerification: { ...verification, [isFarmer ? 'farmer' : 'buyer']: { verified: true, verifiedAt: now } } }); };
  return <div className="quality-verification"><div><strong>Food quality check · {method}</strong><span>{isFarmer ? 'Step 1: verify before handing the order to delivery.' : 'Step 2: confirm quality when the order arrives.'}</span></div><ul>{checks.map((check) => <li key={check}><Check size={13} /> {check}</li>)}</ul><button className="secondary-button" type="button" disabled={!canVerify} onClick={verify}>{completed ? `${isFarmer ? 'Farmer' : 'Buyer'} verified` : isFarmer ? 'Verify farm quality' : verification.farmer?.verified ? 'Confirm delivered quality' : 'Waiting for farmer check'}</button>{completed && <small>Verified {new Date((isFarmer ? verification.farmer : verification.buyer).verifiedAt).toLocaleString('en-IN')}</small>}</div>;
}
function PaymentMethodScanner({ onScan, onClose }) {
  return <PaymentScanner onScan={onScan} onClose={onClose} />;
}

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Check, ChevronDown, CircleDollarSign, CloudRain, Clock3,
  Camera, Leaf, MapPin, Menu, MessageCircle, Minus, PackageCheck, Phone, Plus, Radar, Search, Send, ShoppingBasket,
  Axe, Clock, Headphones, KeyRound, LockKeyhole, LogIn, LogOut, Mail, Mic, MicOff, Route, ShieldCheck, Sprout, Star, Store, TrendingDown, Truck, UserRound, X, Zap
} from 'lucide-react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import { createClient } from './lib/supabase';
import { calculateDemandPrice } from './lib/demandPricing';
import { analyzeProduceScan, calculateAiFreshnessScore } from './lib/freshness';
import NearbyMarkets from './components/NearbyMarkets';
import './styles.css';
import './farmer-header.css';

async function getAuthenticatedProfile(token) {
  const getSupabaseProfile = async () => {
    if (!supabase) throw new Error('Supabase authentication is not configured.');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Your account session is not ready yet. Please try again.');
    const metadata = user.user_metadata || {};
    const role = ['consumer', 'farmer', 'delivery_partner'].includes(metadata.role) ? metadata.role : 'consumer';
    const profile = { user_id: user.id, name: metadata.name || user.email?.split('@')[0] || 'User', email: user.email || '', role, account_status: role === 'delivery_partner' ? 'pending' : 'approved' };
    return { user, profile };
  };

  if (import.meta.env.DEV && /^https?:\/\/localhost:\d+$/.test(DELIVERY_API_URL)) return getSupabaseProfile();

  try {
    const response = await fetch(`${DELIVERY_API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json') ? await response.json() : { error: await response.text() || 'Your account is not approved.' };

    if (!response.ok) {
      if (supabase) {
        console.warn('Delivery profile lookup failed. Falling back to Supabase session data.', result);
        return getSupabaseProfile();
      }
      throw new Error(result.error || 'Your account is not approved.');
    }

    return result;
  } catch (error) {
    if (supabase) {
      console.warn('Using Supabase-only profile fallback after delivery API error.', error);
      return getSupabaseProfile();
    }
    throw error;
  }
}

const seedProduce = [
  { id: 1, name: 'Organic Vine Tomatoes', category: 'Vegetables', farmPrice: 22, middlemanPrice: 45, unit: 'kg', quantity: 146, farmer: 'Ramesh Patel', farm: 'Green Valley Organic Farm', location: 'Pune District, Maharashtra', organic: true, harvest: 'Harvested today', color: 'tomato', description: 'Sun-ripened tomatoes picked fresh at dawn, with zero synthetic pesticides.' },
  { id: 2, name: 'Farm Fresh Potatoes', category: 'Vegetables', farmPrice: 18, middlemanPrice: 32, unit: 'kg', quantity: 397, farmer: 'Gurpreet Singh', farm: 'Golden Fields Agro', location: 'Jalandhar, Punjab', organic: false, harvest: '2 days ago', color: 'potato', description: 'Firm, soil-dusted tubers direct from harvest. Perfect for boiling and roasting.' },
  { id: 3, name: 'Natural Alphonso Mangoes', category: 'Fruits', farmPrice: 450, middlemanPrice: 850, unit: 'dozen', quantity: 45, farmer: 'Subhash Sawant', farm: 'Konkan Heritage Orchards', location: 'Ratnagiri, Maharashtra', organic: true, harvest: 'Freshly picked', color: 'mango', description: 'Hand-plucked Devgad Alphonsos, naturally straw-ripened with intense sweetness.' },
  { id: 4, name: 'Crisp Shimla Apples', category: 'Fruits', farmPrice: 90, middlemanPrice: 160, unit: 'kg', quantity: 200, farmer: 'Tara Chand Verma', farm: 'Himalayan Breeze Orchard', location: 'Kotgarh, Himachal Pradesh', organic: true, harvest: '3 days ago', color: 'apple', description: 'High-altitude mountain apples with a crisp bite and sweet-tart crunch.' },
  { id: 5, name: 'Sharbati Golden Wheat', category: 'Grains', farmPrice: 38, middlemanPrice: 65, unit: 'kg', quantity: 1000, farmer: 'Balram Chouhan', farm: 'Narmada Soil Agro', location: 'Sehore, Madhya Pradesh', organic: true, harvest: 'Recent harvest', color: 'wheat', description: 'Unpolished, protein-rich grain that yields soft, sweet rotis.' },
  { id: 6, name: 'Organic Toor Dal', category: 'Pulses', farmPrice: 120, middlemanPrice: 195, unit: 'kg', quantity: 350, farmer: 'Anasuya Devi', farm: 'Gramodaya Women Farmers Co-op', location: 'Gulbarga, Karnataka', organic: true, harvest: 'Sun-dried last week', color: 'dal', description: 'Unpolished native yellow lentils with an authentic earthy aroma.' },
  { id: 7, name: 'Pure Wild Forest Honey', category: 'Honey', farmPrice: 340, middlemanPrice: 580, unit: 'kg', quantity: 60, farmer: 'Bhimrao Korva', farm: 'Satpura Tribal Bio-Reserve', location: 'Hoshangabad, Madhya Pradesh', organic: true, harvest: 'Raw and unfiltered', color: 'honey', description: 'Raw multi-flora forest honey collected by local beekeepers.' },
  { id: 8, name: 'Fresh A2 Gir Cow Milk', category: 'Dairy', farmPrice: 60, middlemanPrice: 90, unit: 'litre', quantity: 80, farmer: 'Devendra Joshi', farm: 'Gokul Desi Gaushala', location: 'Anand, Gujarat', organic: true, harvest: 'Fresh morning batch', color: 'milk', description: 'Pure grass-fed indigenous Gir cow milk, rich in natural nutrients.' },
  { id: 9, name: 'Fresh Marigold Flowers', category: 'Flowers', farmPrice: 80, middlemanPrice: 140, unit: 'kg', quantity: 120, farmer: 'Lakshmi Reddy', farm: 'Sunrise Flower Farm', location: 'Karnal, Haryana', organic: true, harvest: 'Picked this morning', color: 'flower', description: 'Bright marigolds for hotels, caterers, temples, and celebrations.' }
];

const seedMachinery = [
  { id: 101, name: 'Mahindra 575 Tractor', type: 'Tractor', capacity: '45 HP', rate: 2200, location: 'Warangal, Telangana', owner: 'Ramesh Patel', availableFrom: '2026-09-20', availableTo: '2026-09-30', image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=85', status: 'Available' },
  { id: 102, name: 'Shakti Harvester', type: 'Harvester', capacity: '2 acres/day', rate: 3600, location: 'Nizamabad, Telangana', owner: 'Gurpreet Singh', availableFrom: '2026-09-21', availableTo: '2026-10-05', image: '/assets/farm-market-hero.jpg', status: 'Available' },
  { id: 103, name: 'UltraSpray Boom', type: 'Sprayer', capacity: '200 L tank', rate: 900, location: 'Pune, Maharashtra', owner: 'Anasuya Devi', availableFrom: '2026-09-18', availableTo: '2026-09-25', image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=85', status: 'Available' },
  { id: 104, name: 'Sonalika Seed Drill', type: 'Seeder', capacity: '9-row drill', rate: 1400, location: 'Karnal, Haryana', owner: 'Lakshmi Reddy', availableFrom: '2026-09-22', availableTo: '2026-10-12', image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=85', status: 'Available' },
  { id: 105, name: 'Kisan Rotavator', type: 'Rotavator', capacity: '6 feet', rate: 1200, location: 'Pune, Maharashtra', owner: 'Devendra Joshi', availableFrom: '2026-09-19', availableTo: '2026-10-02', image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=85', status: 'Available' },
  { id: 106, name: 'FieldKing Trailer', type: 'Trailer', capacity: '3 tonnes', rate: 1100, location: 'Anand, Gujarat', owner: 'Subhash Sawant', availableFrom: '2026-09-20', availableTo: '2026-10-20', image: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=85', status: 'Available' },
  { id: 107, name: 'Power Weeder', type: 'Weeder', capacity: '5 HP', rate: 750, location: 'Gulbarga, Karnataka', owner: 'Anasuya Devi', availableFrom: '2026-09-18', availableTo: '2026-09-28', image: 'https://images.unsplash.com/photo-1523742810092-6d3b4f4f0f3d?auto=format&fit=crop&w=900&q=85', status: 'Available' }
];

const categories = ['All', 'Vegetables', 'Fruits', 'Grains', 'Pulses', 'Dairy', 'Honey', 'Flowers'];
const farmInputs = [
  { name: 'Neem Shield Bio-pesticide', type: 'Bio-pesticide', price: 499, discount: '15% farmer offer', image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=85' },
  { name: 'Organic Soil Booster', type: 'Fertilizer', price: 699, discount: '12% farmer offer', image: 'https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=800&q=85' },
  { name: 'Drip Irrigation Starter Kit', type: 'Irrigation', price: 1299, discount: '8% direct grower offer', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=85' },
  { name: 'Native Vegetable Seed Pack', type: 'Seeds', price: 249, discount: '10% seed saver offer', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=85' },
  { name: 'Coir Mulch Cover', type: 'Soil care', price: 349, discount: '12% farmer offer', image: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=800&q=85' },
  { name: 'Harvest Protection Gloves', type: 'Farm gear', price: 179, discount: '5% direct grower offer', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=85' }
];
const catalogTranslations = {
  hi: {
    produce: { 1: ['जैविक बेल टमाटर', 'सब्ज़ियां', 'आज तोड़े गए', 'सुबह ताजे तोड़े गए धूप में पके टमाटर, बिना सिंथेटिक कीटनाशकों के।'], 2: ['खेत के ताजे आलू', 'सब्ज़ियां', '2 दिन पहले', 'खेत से सीधे आए मजबूत आलू, उबालने और भूनने के लिए अच्छे।'], 3: ['प्राकृतिक अल्फांसो आम', 'फल', 'अभी तोड़े गए', 'हाथ से तोड़े गए देवगढ़ अल्फांसो, प्राकृतिक रूप से पकाए गए।'], 4: ['कुरकुरे शिमला सेब', 'फल', '3 दिन पहले', 'ऊंचाई वाले बागों के मीठे और खट्टे कुरकुरे सेब।'], 5: ['शरबती सुनहरा गेहूं', 'अनाज', 'नई फसल', 'बिना पॉलिश किया प्रोटीन से भरपूर गेहूं, मुलायम रोटियों के लिए।'], 6: ['जैविक तूर दाल', 'दालें', 'पिछले सप्ताह धूप में सुखाई गई', 'बिना पॉलिश की देशी पीली दाल, मिट्टी जैसी सुगंध के साथ।'], 7: ['शुद्ध जंगली वन शहद', 'शहद', 'कच्चा और बिना छना', 'स्थानीय मधुमक्खी पालकों द्वारा इकट्ठा किया गया कच्चा वन शहद।'], 8: ['ताजा A2 गिर गाय का दूध', 'डेयरी', 'आज सुबह का बैच', 'घास पर पली देशी गिर गाय का शुद्ध दूध।'] },
    inputs: { 1: ['नीम शील्ड जैव-कीटनाशक', 'जैव-कीटनाशक'], 2: ['जैविक मिट्टी बूस्टर', 'उर्वरक'], 3: ['ड्रिप सिंचाई स्टार्टर किट', 'सिंचाई'], 4: ['देशी सब्ज़ी बीज पैक', 'बीज'], 5: ['नारियल रेशा मल्च कवर', 'मिट्टी देखभाल'], 6: ['फसल सुरक्षा दस्ताने', 'कृषि उपकरण'] }
  },
  te: {
    produce: { 1: ['సేంద్రీయ తీగ టమాటాలు', 'కూరగాయలు', 'ఈరోజు కోసినవి', 'సింథటిక్ పురుగుమందులు లేని, ఉదయం తాజాగా కోసిన టమాటాలు.'], 2: ['తాజా పొలం బంగాళాదుంపలు', 'కూరగాయలు', '2 రోజుల క్రితం', 'పొలం నుంచి నేరుగా వచ్చిన బంగాళాదుంపలు, ఉడికించడానికి మరియు కాల్చడానికి అనుకూలం.'], 3: ['సహజ అల్ఫాన్సో మామిడిపండ్లు', 'పండ్లు', 'తాజాగా కోసినవి', 'చేతితో కోసిన దేవగడ్ అల్ఫాన్సోలు, సహజంగా పండినవి.'], 4: ['కరకరలాడే సిమ్లా ఆపిల్స్', 'పండ్లు', '3 రోజుల క్రితం', 'ఎత్తైన తోటల నుంచి వచ్చిన తీపి-పులుపు కరకరలాడే ఆపిల్స్.'], 5: ['శర్బతి బంగారు గోధుమ', 'ధాన్యాలు', 'ఇటీవలి పంట', 'పాలిష్ చేయని, ప్రోటీన్ అధికంగా ఉన్న మృదువైన రొట్టెల గోధుమ.'], 6: ['సేంద్రీయ కందిపప్పు', 'పప్పులు', 'గత వారం ఎండబెట్టినది', 'పాలిష్ చేయని దేశీ పసుపు పప్పు, సహజ సువాసనతో.'], 7: ['స్వచ్ఛమైన అడవి తేనె', 'తేనె', 'ముడి మరియు వడకట్టనిది', 'స్థానిక తేనెటీగల పెంపకందారులు సేకరించిన ముడి అడవి తేనె.'], 8: ['తాజా A2 గిర్ ఆవు పాలు', 'పాల ఉత్పత్తులు', 'ఈ ఉదయం బ్యాచ్', 'గడ్డి తిన్న దేశీ గిర్ ఆవు నుంచి స్వచ్ఛమైన పాలు.'] },
    inputs: { 1: ['వేప షీల్డ్ బయో-పెస్టిసైడ్', 'బయో-పెస్టిసైడ్'], 2: ['సేంద్రీయ మట్టి బూస్టర్', 'ఎరువు'], 3: ['డ్రిప్ ఇరిగేషన్ స్టార్టర్ కిట్', 'నీటిపారుదల'], 4: ['దేశీ కూరగాయల విత్తన ప్యాక్', 'విత్తనాలు'], 5: ['కొబ్బరి పీచు మల్చ్ కవర్', 'మట్టి సంరక్షణ'], 6: ['పంట రక్షణ గ్లౌజులు', 'వ్యవసాయ పరికరాలు'] }
  },
  ta: {
    produce: { 1: ['இயற்கை கொடி தக்காளி', 'காய்கறிகள்', 'இன்று அறுவடை', 'செயற்கை பூச்சிக்கொல்லிகள் இல்லாமல் இன்று காலை பறிக்கப்பட்ட தக்காளி.'], 2: ['பண்ணை புதிய உருளைக்கிழங்கு', 'காய்கறிகள்', '2 நாட்களுக்கு முன்', 'பண்ணையில் இருந்து நேரடியாக வந்த உருளைக்கிழங்கு.'], 3: ['இயற்கை அல்போன்சோ மாம்பழம்', 'பழங்கள்', 'புதிதாக பறித்தது', 'கையால் பறிக்கப்பட்ட தேவ்கட் அல்போன்சோ மாம்பழங்கள்.'], 4: ['மொறுமொறு சிம்லா ஆப்பிள்', 'பழங்கள்', '3 நாட்களுக்கு முன்', 'மலைத் தோட்டங்களில் விளைந்த இனிப்பு-புளிப்பு ஆப்பிள்கள்.'], 5: ['ஷர்பதி தங்க கோதுமை', 'தானியங்கள்', 'சமீபத்திய அறுவடை', 'பாலிஷ் செய்யாத, புரதம் நிறைந்த கோதுமை.'], 6: ['இயற்கை துவரம் பருப்பு', 'பருப்பு வகைகள்', 'கடந்த வாரம் உலர்த்தியது', 'பாலிஷ் செய்யாத நாட்டுப் பருப்பு.'], 7: ['தூய காட்டு தேன்', 'தேன்', 'வடிகட்டாத இயற்கை தேன்', 'உள்ளூர் தேனீ வளர்ப்பாளர்கள் சேகரித்த காட்டு தேன்.'], 8: ['புதிய A2 கிர் பசும்பால்', 'பால் பொருட்கள்', 'இன்றைய காலை தொகுப்பு', 'புல் மேய்ந்த கிர் பசுவின் தூய பால்.'] },
    inputs: { 1: ['வேம்பு உயிர் பூச்சிக்கொல்லி', 'உயிர் பூச்சிக்கொல்லி'], 2: ['இயற்கை மண் ஊக்கி', 'உரம்'], 3: ['சொட்டு நீர்ப்பாசன தொடக்க கிட்', 'நீர்ப்பாசனம்'], 4: ['நாட்டு காய்கறி விதை தொகுப்பு', 'விதைகள்'], 5: ['தேங்காய் நார் மூடி', 'மண் பராமரிப்பு'], 6: ['அறுவடை பாதுகாப்பு கையுறைகள்', 'பண்ணை உபகரணம்'] }
  },
  kn: {
    produce: { 1: ['ಸಾವಯವ ಬಳ್ಳಿ ಟೊಮ್ಯಾಟೊ', 'ತರಕಾರಿಗಳು', 'ಇಂದು ಕೊಯ್ಲು', 'ಸಂಶ್ಲೇಷಿತ ಕೀಟನಾಶಕಗಳಿಲ್ಲದೆ ಬೆಳಿಗ್ಗೆ ಕೊಯ್ದ ತಾಜಾ ಟೊಮ್ಯಾಟೊ.'], 2: ['ತಾಜಾ ಹೊಲದ ಆಲೂಗಡ್ಡೆ', 'ತರಕಾರಿಗಳು', '2 ದಿನಗಳ ಹಿಂದೆ', 'ಹೊಲದಿಂದ ನೇರವಾಗಿ ಬಂದ ಆಲೂಗಡ್ಡೆ.'], 3: ['ನೈಸರ್ಗಿಕ ಅಲ್ಫಾನ್ಸೋ ಮಾವು', 'ಹಣ್ಣುಗಳು', 'ತಾಜಾ ಕೊಯ್ಲು', 'ಕೈಯಿಂದ ಕೊಯ್ದ ದೇವಗಢ ಅಲ್ಫಾನ್ಸೋ ಮಾವು.'], 4: ['ಗರಿಗರಿಯಾದ ಶಿಮ್ಲಾ ಸೇಬು', 'ಹಣ್ಣುಗಳು', '3 ದಿನಗಳ ಹಿಂದೆ', 'ಬೆಟ್ಟದ ತೋಟಗಳ ಸಿಹಿ-ಹುಳಿ ಸೇಬು.'], 5: ['ಶರ್ಬತಿ ಚಿನ್ನದ ಗೋಧಿ', 'ಧಾನ್ಯಗಳು', 'ಇತ್ತೀಚಿನ ಕೊಯ್ಲು', 'ಪಾಲಿಶ್ ಮಾಡದ, ಪ್ರೋಟೀನ್ ಸಮೃದ್ಧ ಗೋಧಿ.'], 6: ['ಸಾವಯವ ತೊಗರಿಬೇಳೆ', 'ಬೇಳೆಗಳು', 'ಕಳೆದ ವಾರ ಒಣಗಿಸಿದ', 'ಪಾಲಿಶ್ ಮಾಡದ ದೇಶೀ ಹಳದಿ ಬೇಳೆ.'], 7: ['ಶುದ್ಧ ಕಾಡು ಜೇನು', 'ಜೇನು', 'ಕಚ್ಚಾ ಮತ್ತು ಶೋಧಿಸದ', 'ಸ್ಥಳೀಯ ಜೇನು ಸಾಕಾಣಿಕೆದಾರರು ಸಂಗ್ರಹಿಸಿದ ಕಾಡು ಜೇನು.'], 8: ['ತಾಜಾ A2 ಗಿರ್ ಹಸುವಿನ ಹಾಲು', 'ಹಾಲಿನ ಉತ್ಪನ್ನಗಳು', 'ಇಂದಿನ ಬೆಳಗಿನ ಬ್ಯಾಚ್', 'ಹುಲ್ಲು ತಿಂದ ಗಿರ್ ಹಸುವಿನ ಶುದ್ಧ ಹಾಲು.'] },
    inputs: { 1: ['ಬೇವಿನ ಜೈವಿಕ ಕೀಟನಾಶಕ', 'ಜೈವಿಕ ಕೀಟನಾಶಕ'], 2: ['ಸಾವಯವ ಮಣ್ಣು ಬೂಸ್ಟರ್', 'ರಸಗೊಬ್ಬರ'], 3: ['ಡ್ರಿಪ್ ನೀರಾವರಿ ಸ್ಟಾರ್ಟರ್ ಕಿಟ್', 'ನೀರಾವರಿ'], 4: ['ಸ್ಥಳೀಯ ತರಕಾರಿ ಬೀಜ ಪ್ಯಾಕ್', 'ಬೀಜಗಳು'], 5: ['ತೆಂಗಿನ ನಾರು ಮಲ್ಚ್ ಕವರ್', 'ಮಣ್ಣಿನ ಆರೈಕೆ'], 6: ['ಕೊಯ್ಲು ರಕ್ಷಣಾ ಕೈಗವಸುಗಳು', 'ಕೃಷಿ ಉಪಕರಣ'] }
  },
  ml: {
    produce: { 1: ['ജൈവ വള്ളി തക്കാളി', 'പച്ചക്കറികൾ', 'ഇന്ന് വിളവെടുത്തത്', 'കൃത്രിമ കീടനാശിനികളില്ലാതെ ഇന്ന് രാവിലെ പറിച്ച തക്കാളി.'], 2: ['പുതിയ കൃഷിയിട ഉരുളക്കിഴങ്ങ്', 'പച്ചക്കറികൾ', '2 ദിവസം മുമ്പ്', 'കൃഷിയിടത്തിൽ നിന്ന് നേരിട്ട് എത്തിച്ച ഉരുളക്കിഴങ്ങ്.'], 3: ['സ്വാഭാവിക അൽഫോൻസോ മാമ്പഴം', 'പഴങ്ങൾ', 'പുതുതായി പറിച്ചത്', 'കൈകൊണ്ട് പറിച്ച ദേവ്ഗഡ് അൽഫോൻസോ മാമ്പഴം.'], 4: ['കറുമുറുക്കുള്ള ഷിംല ആപ്പിൾ', 'പഴങ്ങൾ', '3 ദിവസം മുമ്പ്', 'മലനിരകളിലെ തോട്ടങ്ങളിൽ നിന്നുള്ള മധുരമുള്ള ആപ്പിൾ.'], 5: ['ശർബതി സ്വർണ്ണ ഗോതമ്പ്', 'ധാന്യങ്ങൾ', 'പുതിയ വിള', 'പോളിഷ് ചെയ്യാത്ത പ്രോട്ടീൻ സമ്പന്നമായ ഗോതമ്പ്.'], 6: ['ജൈവ തുവരപ്പരിപ്പ്', 'പരിപ്പുകൾ', 'കഴിഞ്ഞ ആഴ്ച ഉണക്കിയത്', 'പോളിഷ് ചെയ്യാത്ത നാടൻ മഞ്ഞപ്പരിപ്പ്.'], 7: ['ശുദ്ധമായ കാട്ടുതേൻ', 'തേൻ', 'അസംസ്കൃതവും അരിച്ചിട്ടില്ലാത്തതും', 'പ്രാദേശിക തേനീച്ച വളർത്തുന്നവർ ശേഖരിച്ച കാട്ടുതേൻ.'], 8: ['പുതിയ A2 ഗിർ പശുവിൻ പാൽ', 'പാൽ ഉൽപ്പന്നങ്ങൾ', 'ഇന്നത്തെ രാവിലെ ബാച്ച്', 'പുല്ലുതിന്ന ഗിർ പശുവിന്റെ ശുദ്ധമായ പാൽ.'] },
    inputs: { 1: ['വേപ്പ് ജൈവ കീടനാശിനി', 'ജൈവ കീടനാശിനി'], 2: ['ജൈവ മണ്ണ് ബൂസ്റ്റർ', 'വളം'], 3: ['ഡ്രിപ്പ് ജലസേചന സ്റ്റാർട്ടർ കിറ്റ്', 'ജലസേചനം'], 4: ['നാടൻ പച്ചക്കറി വിത്ത് പാക്ക്', 'വിത്തുകൾ'], 5: ['തേങ്ങാനാര് മൾച്ച് കവർ', 'മണ്ണ് പരിചരണം'], 6: ['വിള സംരക്ഷണ കയ്യുറകൾ', 'കാർഷിക ഉപകരണങ്ങൾ'] }
  }
};
const householdLabels = { en: 'Household', hi: 'घरेलू', te: 'గృహ వినియోగం', ta: 'வீட்டு பயன்பாடு', kn: 'ಮನೆಯ ಬಳಕೆ', ml: 'ഗാർഹികം' };
const farmerHubLabels = {
  en: { kicker: 'YOUR FARM, YOUR TERMS', title: 'Farmer', accent: 'hub', intro: 'Manage your harvest, reach buyers, and source what your farm needs.', add: 'Add a listing', active: 'ACTIVE LISTINGS', revenue: 'DIRECT REVENUE', received: 'ORDERS RECEIVED', reach: 'YOUR REACH', buyers: 'buyers', harvest: 'YOUR HARVEST', listings: 'Active listings', crops: 'crops', available: 'available', incoming: 'INCOMING', recent: 'Recent orders', empty: 'No orders yet' },
  hi: { kicker: 'आपका खेत, आपकी शर्तें', title: 'किसान', accent: 'केंद्र', intro: 'अपनी फसल संभालें, खरीदारों तक पहुंचें और खेत की जरूरतों की खरीद करें।', add: 'लिस्टिंग जोड़ें', active: 'सक्रिय लिस्टिंग', revenue: 'सीधी आय', received: 'प्राप्त ऑर्डर', reach: 'आपकी पहुंच', buyers: 'खरीदार', harvest: 'आपकी फसल', listings: 'सक्रिय लिस्टिंग', crops: 'फसलें', available: 'उपलब्ध', incoming: 'आने वाले', recent: 'हाल के ऑर्डर', empty: 'अभी कोई ऑर्डर नहीं' },
  te: { kicker: 'మీ పొలం, మీ నిబంధనలు', title: 'రైతు', accent: 'కేంద్రం', intro: 'మీ పంటను నిర్వహించండి, కొనుగోలుదారులను చేరుకోండి మరియు పొలానికి కావాల్సినవి పొందండి.', add: 'లిస్టింగ్ జోడించండి', active: 'చురుకైన లిస్టింగ్‌లు', revenue: 'నేరుగా ఆదాయం', received: 'అందిన ఆర్డర్లు', reach: 'మీ పరిధి', buyers: 'కొనుగోలుదారులు', harvest: 'మీ పంట', listings: 'చురుకైన లిస్టింగ్‌లు', crops: 'పంటలు', available: 'అందుబాటులో ఉంది', incoming: 'వస్తున్నవి', recent: 'ఇటీవలి ఆర్డర్లు', empty: 'ఇంకా ఆర్డర్లు లేవు' },
  ta: { kicker: 'உங்கள் பண்ணை, உங்கள் விதிகள்', title: 'விவசாயி', accent: 'மையம்', intro: 'உங்கள் அறுவடையை நிர்வகித்து, வாங்குபவர்களை அடைந்து, பண்ணைக்குத் தேவையானவற்றைப் பெறுங்கள்.', add: 'பட்டியல் சேர்க்கவும்', active: 'செயலில் உள்ள பட்டியல்கள்', revenue: 'நேரடி வருவாய்', received: 'பெறப்பட்ட ஆர்டர்கள்', reach: 'உங்கள் அணுகல்', buyers: 'வாங்குபவர்கள்', harvest: 'உங்கள் அறுவடை', listings: 'செயலில் உள்ள பட்டியல்கள்', crops: 'பயிர்கள்', available: 'கிடைக்கும்', incoming: 'வருபவை', recent: 'சமீபத்திய ஆர்டர்கள்', empty: 'ஆர்டர்கள் எதுவும் இல்லை' },
  kn: { kicker: 'ನಿಮ್ಮ ಜಮೀನು, ನಿಮ್ಮ ನಿಯಮಗಳು', title: 'ರೈತ', accent: 'ಕೇಂದ್ರ', intro: 'ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ನಿರ್ವಹಿಸಿ, ಖರೀದಿದಾರರನ್ನು ತಲುಪಿ ಮತ್ತು ಜಮೀನಿಗೆ ಬೇಕಾದುದನ್ನು ಪಡೆಯಿರಿ.', add: 'ಪಟ್ಟಿ ಸೇರಿಸಿ', active: 'ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳು', revenue: 'ನೇರ ಆದಾಯ', received: 'ಸ್ವೀಕರಿಸಿದ ಆರ್ಡರ್‌ಗಳು', reach: 'ನಿಮ್ಮ ವ್ಯಾಪ್ತಿ', buyers: 'ಖರೀದಿದಾರರು', harvest: 'ನಿಮ್ಮ ಕೊಯ್ಲು', listings: 'ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳು', crops: 'ಬೆಳೆಗಳು', available: 'ಲಭ್ಯವಿದೆ', incoming: 'ಬರುತ್ತಿರುವವು', recent: 'ಇತ್ತೀಚಿನ ಆರ್ಡರ್‌ಗಳು', empty: 'ಇನ್ನೂ ಆರ್ಡರ್‌ಗಳಿಲ್ಲ' },
  ml: { kicker: 'നിങ്ങളുടെ കൃഷിയിടം, നിങ്ങളുടെ നിബന്ധനകൾ', title: 'കർഷക', accent: 'കേന്ദ്രം', intro: 'നിങ്ങളുടെ വിള നിയന്ത്രിച്ച്, വാങ്ങുന്നവരിലെത്തി, കൃഷിയിടത്തിന് ആവശ്യമായവ നേടൂ.', add: 'ലിസ്റ്റിംഗ് ചേർക്കൂ', active: 'സജീവ ലിസ്റ്റിംഗുകൾ', revenue: 'നേരിട്ടുള്ള വരുമാനം', received: 'ലഭിച്ച ഓർഡറുകൾ', reach: 'നിങ്ങളുടെ എത്തിച്ചേരൽ', buyers: 'വാങ്ങുന്നവർ', harvest: 'നിങ്ങളുടെ വിള', listings: 'സജീവ ലിസ്റ്റിംഗുകൾ', crops: 'വിളകൾ', available: 'ലഭ്യമാണ്', incoming: 'വരുന്നവ', recent: 'സമീപകാല ഓർഡറുകൾ', empty: 'ഓർഡറുകളൊന്നുമില്ല' }
};
const localizedUnits = { hi: { kg: 'किलो', dozen: 'दर्जन', litre: 'लीटर' }, te: { kg: 'కిలో', dozen: 'డజను', litre: 'లీటర్' }, ta: { kg: 'கிலோ', dozen: 'டஜன்', litre: 'லிட்டர்' }, kn: { kg: 'ಕೆಜಿ', dozen: 'ಡಜನ್', litre: 'ಲೀಟರ್' }, ml: { kg: 'കിലോ', dozen: 'ഡസൻ', litre: 'ലിറ്റർ' } };
const produceMetaTranslations = {
  hi: { 3: { farmer: 'सुभाष सावंत', farm: 'कोंकण हेरिटेज ऑर्चर्ड्स', location: 'रत्नागिरी, महाराष्ट्र' } },
  te: { 3: { farmer: 'సుభాష్ సావంత్', farm: 'కొంకణ్ హెరిటేజ్ ఆర్చర్డ్స్', location: 'రత్నగిరి, మహారాష్ట్ర' } },
  ta: { 3: { farmer: 'சுபாஷ் சாவந்த்', farm: 'கொங்கண் ஹெரிடேஜ் ஆர்ச்சர்ட்ஸ்', location: 'ரத்னகிரி, மகாராஷ்டிரா' } },
  kn: { 3: { farmer: 'ಸುಭಾಷ್ ಸಾವಂತ್', farm: 'ಕೊಂಕಣ್ ಹೆರಿಟೇಜ್ ಆರ್ಚರ್ಡ್ಸ್', location: 'ರತ್ನಗಿರಿ, ಮಹಾರಾಷ್ಟ್ರ' } },
  ml: { 3: { farmer: 'സുഭാഷ് സാവന്ത്', farm: 'കൊങ്കൺ ഹെറിറ്റേജ് ഓർച്ചാർഡ്സ്', location: 'രത്നഗിരി, മഹാരാഷ്ട്ര' } }
};
function localizeProduce(item, language) { const translated = catalogTranslations[language]?.produce?.[item.id]; const metadata = produceMetaTranslations[language]?.[item.id]; return translated ? { ...item, name: translated[0], category: translated[1], harvest: translated[2], description: translated[3], ...metadata, unitLabel: localizedUnits[language]?.[item.unit] || item.unit } : item; }
function localizeInput(input, index, language) { const translated = catalogTranslations[language]?.inputs?.[index + 1]; return translated ? { ...input, name: translated[0], type: translated[1] } : input; }
const buyerTypes = ['Household', 'Caterer', 'Supermarket', 'Retailer'];
const deliveryPartners = ['Anil Kumar', 'Meena Logistics', 'GreenRoute Partner'];
const partnerOffers = { 'Anil Kumar': '10% fuel bonus', 'Meena Logistics': 'Free first stop', 'GreenRoute Partner': '15% route offer' };
const partnerLocations = { 'Anil Kumar': { lat: 17.385, lng: 78.4867 }, 'Meena Logistics': { lat: 17.42, lng: 78.45 }, 'GreenRoute Partner': { lat: 17.31, lng: 78.52 } };
const deliveryChargePerKm = 20;
const produceImages = {
  1: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=85',
  2: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=85',
  3: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=85',
  4: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=85',
  5: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85',
  6: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=85',
  7: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=85',
  8: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=85'
};
const money = (value) => `₹${value.toLocaleString('en-IN')}`;
const qualityChecks = {
  Organic: ['Organic method confirmed', 'Harvest date recorded', 'No synthetic inputs used'],
  Natural: ['Natural growing method confirmed', 'Harvest date recorded', 'Produce inspected before packing'],
  Conventional: ['Growing method recorded', 'Harvest date recorded', 'Produce inspected before packing']
};
const qualityMethod = (item) => item.productionMethod || (item.organic ? 'Organic' : 'Conventional');
const UPI_ID = import.meta.env.VITE_UPI_ID || 'farmersatoz@upi';
const WHATSAPP_HELP_LINE = '+917337470485';
const supabase = (() => { try { return createClient(); } catch { return null; } })();
const DELIVERY_API_URL = import.meta.env.VITE_DELIVERY_API_URL || 'http://localhost:8787';
const authHeaders = async () => { const sessionResult = await supabase?.auth.getSession(); const token = sessionResult?.data?.session?.access_token; return token ? { Authorization: `Bearer ${token}` } : {}; };
const paymentAppLink = (method, amount) => method === 'PhonePe' ? `phonepe://pay?pa=${UPI_ID}&pn=Farmers%20A%20to%20Z&am=${amount}&cu=INR` : method === 'Google Pay' ? `tez://upi/pay?pa=${UPI_ID}&pn=Farmers%20A%20to%20Z&am=${amount}&cu=INR` : '';
const openPaymentApp = (method, amount) => { const link = paymentAppLink(method, amount); if (!link) return; const anchor = document.createElement('a'); anchor.href = link; anchor.target = '_self'; anchor.rel = 'noopener'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); };
const whatsappLink = (phone, message = '') => `https://wa.me/${phone.replace(/\D/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
const speechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;
let activeVoiceRecognition = null;
const distanceBetween = (from, to) => { if (!from || !to) return Number.POSITIVE_INFINITY; const radians = (value) => value * Math.PI / 180; const latDelta = radians(to.lat - from.lat); const lngDelta = radians(to.lng - from.lng); const area = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(area), Math.sqrt(1 - area)); };
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const loadMachinery = () => {
  const saved = load('farmdirect-machinery-v2', null);
  if (saved) return saved;
  const legacy = load('farmdirect-machinery-v1', null);
  if (!legacy) return seedMachinery;
  return [...seedMachinery.filter((machine) => !legacy.some((item) => item.id === machine.id)), ...legacy];
};
const LanguageContext = createContext(null);
const translations = {
  en: { marketplace: 'Marketplace', radar: 'Demand Radar', calculator: 'Zero cut', orders: 'Orders', farmer: 'Farmer hub', consumer: 'Consumer', farmerRole: 'Farmer', login: 'Log in', directSource: 'DIRECT FROM THE SOURCE', goodFood: 'Good food.', fairlyPriced: 'Fairly priced.', explore: 'Explore the harvest', weeklyHarvest: 'THE WEEKLY HARVEST', findStaple: 'Find your next staple', searchProduce: 'Search produce, farms, or places', radarKicker: 'AI-POWERED MARKET SIGNALS', demandRadar: 'Demand radar', demandIntro: 'See where demand is rising before you plant, price, or move your harvest.', liveSignals: 'LIVE SIGNALS', searchDemand: 'Search a produce to see demand...', aiSearch: 'AI SEARCH', telanganaNetwork: 'TELANGANA NETWORK', demandAcross: 'Demand across the state', aiReadout: 'AI READOUT', growNext: 'What to grow next', noSignal: 'No matching demand signal yet', tryTracked: 'Try one of the tracked crops to see a live market recommendation.', low: 'Low', medium: 'Medium', high: 'High' },
  hi: { marketplace: 'बाज़ार', radar: 'मांग रडार', calculator: 'बिचौलिया मुक्त', orders: 'ऑर्डर', farmer: 'किसान केंद्र', consumer: 'ग्राहक', farmerRole: 'किसान', login: 'लॉग इन', directSource: 'सीधे खेत से', goodFood: 'अच्छा खाना।', fairlyPriced: 'उचित कीमत पर।', explore: 'फसल देखें', weeklyHarvest: 'साप्ताहिक फसल', findStaple: 'अपनी अगली फसल खोजें', searchProduce: 'फसल, खेत या जगह खोजें', radarKicker: 'एआई बाज़ार संकेत', demandRadar: 'मांग रडार', demandIntro: 'बोने, कीमत तय करने या फसल भेजने से पहले बढ़ती मांग देखें।', liveSignals: 'लाइव संकेत', searchDemand: 'मांग देखने के लिए फसल खोजें...', aiSearch: 'एआई खोज', telanganaNetwork: 'तेलंगाना नेटवर्क', demandAcross: 'राज्य में मांग', aiReadout: 'एआई जानकारी', growNext: 'अगली फसल क्या उगाएं', noSignal: 'कोई मिलती मांग नहीं मिली', tryTracked: 'लाइव सुझाव के लिए सूचीबद्ध फसल खोजें।', low: 'कम', medium: 'मध्यम', high: 'अधिक' },
  te: { marketplace: 'మార్కెట్', radar: 'డిమాండ్ రాడార్', calculator: 'మధ్యవర్తులు లేరు', orders: 'ఆర్డర్లు', farmer: 'రైతు కేంద్రం', consumer: 'వినియోగదారు', farmerRole: 'రైతు', login: 'లాగిన్', directSource: 'పొలం నుంచే నేరుగా', goodFood: 'మంచి ఆహారం.', fairlyPriced: 'న్యాయమైన ధరలో.', explore: 'పంటను చూడండి', weeklyHarvest: 'ఈ వారం పంట', findStaple: 'మీకు కావాల్సిన పంటను కనుగొనండి', searchProduce: 'పంట, పొలం లేదా ప్రాంతాన్ని వెతకండి', radarKicker: 'ఏఐ మార్కెట్ సంకేతాలు', demandRadar: 'డిమాండ్ రాడార్', demandIntro: 'విత్తే ముందు, ధర నిర్ణయించే ముందు లేదా పంటను పంపే ముందు పెరుగుతున్న డిమాండ్‌ను చూడండి.', liveSignals: 'లైవ్ సంకేతాలు', searchDemand: 'డిమాండ్ చూడటానికి పంటను వెతకండి...', aiSearch: 'ఏఐ శోధన', telanganaNetwork: 'తెలంగాణ నెట్‌వర్క్', demandAcross: 'రాష్ట్రవ్యాప్తంగా డిమాండ్', aiReadout: 'ఏఐ సమాచారం', growNext: 'తర్వాత ఏ పంట పండించాలి', noSignal: 'సరిపోలే డిమాండ్ సంకేతం లేదు', tryTracked: 'లైవ్ సూచన కోసం అందుబాటులో ఉన్న పంటను వెతకండి.', low: 'తక్కువ', medium: 'మధ్యస్థం', high: 'ఎక్కువ' }
};
Object.assign(translations, {
  ta: { marketplace: 'சந்தை', radar: 'தேவை ரேடார்', calculator: 'இடைத்தரகர் இல்லை', orders: 'ஆர்டர்கள்', farmer: 'விவசாய மையம்', consumer: 'வாடிக்கையாளர்', farmerRole: 'விவசாயி', login: 'உள்நுழை', directSource: 'வயலில் இருந்து நேரடியாக', goodFood: 'நல்ல உணவு.', fairlyPriced: 'நியாயமான விலையில்.', explore: 'அறுவடையை காண்க', weeklyHarvest: 'வாராந்திர அறுவடை', findStaple: 'உங்கள் அடுத்த விளைபொருளை கண்டறியுங்கள்', searchProduce: 'விளைபொருள், பண்ணை அல்லது இடத்தை தேடுங்கள்', radarKicker: 'AI சந்தை சிக்னல்கள்', demandRadar: 'தேவை ரேடார்', demandIntro: 'விதைப்பதற்கு முன், விலை நிர்ணயிப்பதற்கு முன் அல்லது அறுவடையை அனுப்புவதற்கு முன் அதிகரிக்கும் தேவையை காணுங்கள்.', liveSignals: 'நேரடி சிக்னல்கள்', searchDemand: 'தேவையை காண விளைபொருளை தேடுங்கள்...', aiSearch: 'AI தேடல்', demandAcross: 'மாநிலம் முழுவதும் தேவை', aiReadout: 'AI தகவல்', growNext: 'அடுத்து என்ன பயிரிடலாம்', noSignal: 'பொருந்தும் தேவை சிக்னல் இல்லை', tryTracked: 'நேரடி பரிந்துரைக்கு பட்டியலில் உள்ள பயிரை தேடுங்கள்.', low: 'குறைவு', medium: 'நடுத்தரம்', high: 'அதிகம்' },
  kn: { marketplace: 'ಮಾರುಕಟ್ಟೆ', radar: 'ಬೇಡಿಕೆ ರೇಡಾರ್', calculator: 'ಮಧ್ಯವರ್ತಿಗಳಿಲ್ಲ', orders: 'ಆರ್ಡರ್‌ಗಳು', farmer: 'ರೈತ ಕೇಂದ್ರ', consumer: 'ಗ್ರಾಹಕ', farmerRole: 'ರೈತ', login: 'ಲಾಗಿನ್', directSource: 'ಜಮೀನಿನಿಂದ ನೇರವಾಗಿ', goodFood: 'ಉತ್ತಮ ಆಹಾರ.', fairlyPriced: 'ನ್ಯಾಯವಾದ ಬೆಲೆಯಲ್ಲಿ.', explore: 'ಬೆಳೆ ನೋಡಿ', weeklyHarvest: 'ವಾರದ ಕೊಯ್ಲು', findStaple: 'ನಿಮ್ಮ ಮುಂದಿನ ಬೆಳೆಯನ್ನು ಹುಡುಕಿ', searchProduce: 'ಬೆಳೆ, ಜಮೀನು ಅಥವಾ ಸ್ಥಳ ಹುಡುಕಿ', radarKicker: 'AI ಮಾರುಕಟ್ಟೆ ಸೂಚನೆಗಳು', demandRadar: 'ಬೇಡಿಕೆ ರೇಡಾರ್', demandIntro: 'ಬಿತ್ತನೆ, ಬೆಲೆ ನಿಗದಿ ಅಥವಾ ಬೆಳೆ ಸಾಗಣೆಗೆ ಮೊದಲು ಹೆಚ್ಚುತ್ತಿರುವ ಬೇಡಿಕೆಯನ್ನು ನೋಡಿ.', liveSignals: 'ನೇರ ಸೂಚನೆಗಳು', searchDemand: 'ಬೇಡಿಕೆ ನೋಡಲು ಬೆಳೆಯನ್ನು ಹುಡುಕಿ...', aiSearch: 'AI ಹುಡುಕಾಟ', demandAcross: 'ರಾಜ್ಯಾದ್ಯಂತ ಬೇಡಿಕೆ', aiReadout: 'AI ಮಾಹಿತಿ', growNext: 'ಮುಂದೆ ಏನು ಬೆಳೆಯಬೇಕು', noSignal: 'ಹೊಂದುವ ಬೇಡಿಕೆ ಸೂಚನೆ ಇಲ್ಲ', tryTracked: 'ನೇರ ಶಿಫಾರಸಿಗಾಗಿ ಪಟ್ಟಿಯಲ್ಲಿರುವ ಬೆಳೆಯನ್ನು ಹುಡುಕಿ.', low: 'ಕಡಿಮೆ', medium: 'ಮಧ್ಯಮ', high: 'ಹೆಚ್ಚು' },
  ml: { marketplace: 'വിപണി', radar: 'ഡിമാൻഡ് റഡാർ', calculator: 'ഇടനിലക്കാരില്ല', orders: 'ഓർഡറുകൾ', farmer: 'കർഷക കേന്ദ്രം', consumer: 'ഉപഭോക്താവ്', farmerRole: 'കർഷകൻ', login: 'ലോഗിൻ', directSource: 'കൃഷിയിടത്തിൽ നിന്ന് നേരിട്ട്', goodFood: 'നല്ല ഭക്ഷണം.', fairlyPriced: 'ന്യായമായ വിലയിൽ.', explore: 'വിള കാണുക', weeklyHarvest: 'ആഴ്ചയിലെ വിള', findStaple: 'നിങ്ങളുടെ അടുത്ത വിള കണ്ടെത്തുക', searchProduce: 'വിള, കൃഷിയിടം അല്ലെങ്കിൽ സ്ഥലം തിരയുക', radarKicker: 'AI വിപണി സൂചനകൾ', demandRadar: 'ഡിമാൻഡ് റഡാർ', demandIntro: 'നടുന്നതിന് മുമ്പും വില നിശ്ചയിക്കുന്നതിന് മുമ്പും വിള അയയ്ക്കുന്നതിന് മുമ്പും ഉയരുന്ന ആവശ്യം കാണുക.', liveSignals: 'തത്സമയ സൂചനകൾ', searchDemand: 'ഡിമാൻഡ് കാണാൻ വിള തിരയുക...', aiSearch: 'AI തിരയൽ', demandAcross: 'സംസ്ഥാനത്തുടനീളമുള്ള ഡിമാൻഡ്', aiReadout: 'AI വിവരം', growNext: 'അടുത്തതായി എന്ത് വളർത്തണം', noSignal: 'പൊരുത്തപ്പെടുന്ന ഡിമാൻഡ് സൂചനയില്ല', tryTracked: 'തത്സമയ ശുപാർശയ്ക്കായി പട്ടികയിലെ വിള തിരയുക.', low: 'കുറവ്', medium: 'ഇടത്തരം', high: 'കൂടുതൽ' }
});
const interfaceTranslations = {
  en: { addProduce: 'Add produce', farmInputs: 'Farm inputs', previousOrders: 'Previous orders', reviews: 'Reviews', inputsKicker: 'FARM SUPPLY MARKET', inputsTitle: 'Agricultural', inputsAccent: 'inputs', inputsIntro: 'Source practical seeds, soil care, crop protection, irrigation, and farm gear directly for your next growing cycle.', ordersKicker: 'YOUR FARM CONNECTIONS', ordersTitle: 'Orders &', ordersAccent: 'savings', ordersIntro: 'Every order is a direct line to the people who grow your food.', totalSpent: 'TOTAL SPENT', saved: "YOU'VE SAVED", waiting: 'Your basket is waiting', ordersEmpty: 'Orders you place from the marketplace will appear here.', reviewsKicker: 'TRUST ACROSS THE NETWORK', reviewsTitle: 'Reviews &', reviewsAccent: 'feedback', reviewsIntro: 'Share helpful feedback about the farmers who grow your food.', reviewFarmer: 'REVIEW A FARMER', reviewPrompt: 'Help the next buyer choose well.', rating: 'Rating', writeReview: 'Write a review about this farmer or their produce...', publishReview: 'Publish review', suppliesAvailable: 'supplies available', stockUp: 'Stock up for less', growNext: 'GROW WHAT IS NEXT' },
  hi: { addProduce: 'उपज जोड़ें', farmInputs: 'कृषि सामग्री', previousOrders: 'पिछले ऑर्डर', reviews: 'समीक्षाएं', inputsKicker: 'कृषि आपूर्ति बाजार', inputsTitle: 'कृषि', inputsAccent: 'सामग्री', inputsIntro: 'अगली खेती के लिए बीज, मिट्टी की देखभाल, फसल सुरक्षा, सिंचाई और कृषि उपकरण सीधे पाएं।', ordersKicker: 'आपके खेत के संबंध', ordersTitle: 'ऑर्डर और', ordersAccent: 'बचत', ordersIntro: 'हर ऑर्डर आपके भोजन उगाने वाले किसानों से सीधा संबंध है।', totalSpent: 'कुल खर्च', saved: 'आपने बचाया', waiting: 'आपकी टोकरी आपका इंतजार कर रही है', ordersEmpty: 'बाजार से किए गए ऑर्डर यहां दिखाई देंगे।', reviewsKicker: 'नेटवर्क में भरोसा', reviewsTitle: 'समीक्षाएं और', reviewsAccent: 'प्रतिक्रिया', reviewsIntro: 'फसल उगाने वाले किसानों के बारे में उपयोगी प्रतिक्रिया साझा करें।', reviewFarmer: 'किसान की समीक्षा करें', reviewPrompt: 'अगले खरीदार की सही चुनाव में मदद करें।', rating: 'रेटिंग', writeReview: 'इस किसान या उसकी उपज के बारे में समीक्षा लिखें...', publishReview: 'समीक्षा प्रकाशित करें', suppliesAvailable: 'सामग्री उपलब्ध', stockUp: 'कम कीमत में खरीदें', growNext: 'आगे उगाएं' },
  te: { addProduce: 'పంటను జోడించండి', farmInputs: 'వ్యవసాయ సామగ్రి', previousOrders: 'మునుపటి ఆర్డర్లు', reviews: 'సమీక్షలు', inputsKicker: 'వ్యవసాయ సరఫరా మార్కెట్', inputsTitle: 'వ్యవసాయ', inputsAccent: 'సామగ్రి', inputsIntro: 'తదుపరి పంట కోసం విత్తనాలు, నేల సంరక్షణ, పంట రక్షణ, నీటిపారుదల మరియు పరికరాలను నేరుగా పొందండి.', ordersKicker: 'మీ పొలం సంబంధాలు', ordersTitle: 'ఆర్డర్లు మరియు', ordersAccent: 'ఆదా', ordersIntro: 'ప్రతి ఆర్డర్ మీ ఆహారం పండించే రైతులతో నేరుగా కలుపుతుంది.', totalSpent: 'మొత్తం ఖర్చు', saved: 'మీరు ఆదా చేసినది', waiting: 'మీ బాస్కెట్ ఎదురుచూస్తోంది', ordersEmpty: 'మార్కెట్‌లో చేసే ఆర్డర్లు ఇక్కడ కనిపిస్తాయి.', reviewsKicker: 'నెట్‌వర్క్‌లో నమ్మకం', reviewsTitle: 'సమీక్షలు మరియు', reviewsAccent: 'అభిప్రాయం', reviewsIntro: 'మీ ఆహారం పండించే రైతుల గురించి ఉపయోగకరమైన అభిప్రాయాన్ని పంచుకోండి.', reviewFarmer: 'రైతును సమీక్షించండి', reviewPrompt: 'తదుపరి కొనుగోలుదారుకు మంచి ఎంపికలో సహాయపడండి.', rating: 'రేటింగ్', writeReview: 'ఈ రైతు లేదా పంట గురించి సమీక్ష రాయండి...', publishReview: 'సమీక్షను ప్రచురించండి', suppliesAvailable: 'సరఫరాలు అందుబాటులో ఉన్నాయి', stockUp: 'తక్కువకు నిల్వ చేసుకోండి', growNext: 'తర్వాత పండించండి' },
  ta: { addProduce: 'விளைபொருள் சேர்க்கவும்', farmInputs: 'விவசாயப் பொருட்கள்', previousOrders: 'முந்தைய ஆர்டர்கள்', reviews: 'விமர்சனங்கள்', inputsKicker: 'விவசாய விநியோக சந்தை', inputsTitle: 'விவசாய', inputsAccent: 'பொருட்கள்', inputsIntro: 'அடுத்த சாகுபடிக்கான விதைகள், மண் பராமரிப்பு, பயிர் பாதுகாப்பு, நீர்ப்பாசனம் மற்றும் கருவிகளை நேரடியாகப் பெறுங்கள்.', ordersKicker: 'உங்கள் பண்ணை தொடர்புகள்', ordersTitle: 'ஆர்டர்கள் மற்றும்', ordersAccent: 'சேமிப்பு', ordersIntro: 'ஒவ்வொரு ஆர்டரும் உங்கள் உணவை வளர்க்கும் விவசாயிகளுடன் நேரடி தொடர்பாகும்.', totalSpent: 'மொத்த செலவு', saved: 'நீங்கள் சேமித்தது', waiting: 'உங்கள் கூடை காத்திருக்கிறது', ordersEmpty: 'சந்தையில் நீங்கள் செய்யும் ஆர்டர்கள் இங்கே தோன்றும்.', reviewsKicker: 'வலையமைப்பின் நம்பிக்கை', reviewsTitle: 'விமர்சனங்கள் மற்றும்', reviewsAccent: 'கருத்துகள்', reviewsIntro: 'உங்கள் உணவை வளர்க்கும் விவசாயிகளைப் பற்றி பயனுள்ள கருத்தைப் பகிருங்கள்.', reviewFarmer: 'விவசாயியை மதிப்பிடுங்கள்', reviewPrompt: 'அடுத்த வாங்குபவர் நல்ல தேர்வு செய்ய உதவுங்கள்.', rating: 'மதிப்பீடு', writeReview: 'இந்த விவசாயி அல்லது விளைபொருள் பற்றி எழுதுங்கள்...', publishReview: 'விமர்சனத்தை வெளியிடுங்கள்', suppliesAvailable: 'பொருட்கள் கிடைக்கின்றன', stockUp: 'குறைந்த விலையில் வாங்குங்கள்', growNext: 'அடுத்து வளர்க்கவும்' },
  kn: { addProduce: 'ಬೆಳೆ ಸೇರಿಸಿ', farmInputs: 'ಕೃಷಿ ಸಾಮಗ್ರಿಗಳು', previousOrders: 'ಹಿಂದಿನ ಆರ್ಡರ್‌ಗಳು', reviews: 'ವಿಮರ್ಶೆಗಳು', inputsKicker: 'ಕೃಷಿ ಪೂರೈಕೆ ಮಾರುಕಟ್ಟೆ', inputsTitle: 'ಕೃಷಿ', inputsAccent: 'ಸಾಮಗ್ರಿಗಳು', inputsIntro: 'ಮುಂದಿನ ಬೆಳೆಗೆ ಬೀಜಗಳು, ಮಣ್ಣಿನ ಆರೈಕೆ, ಬೆಳೆ ರಕ್ಷಣೆ, ನೀರಾವರಿ ಮತ್ತು ಉಪಕರಣಗಳನ್ನು ನೇರವಾಗಿ ಪಡೆಯಿರಿ.', ordersKicker: 'ನಿಮ್ಮ ಜಮೀನಿನ ಸಂಪರ್ಕಗಳು', ordersTitle: 'ಆರ್ಡರ್‌ಗಳು ಮತ್ತು', ordersAccent: 'ಉಳಿತಾಯ', ordersIntro: 'ಪ್ರತಿ ಆರ್ಡರ್ ನಿಮ್ಮ ಆಹಾರ ಬೆಳೆಯುವ ರೈತರೊಂದಿಗೆ ನೇರ ಸಂಪರ್ಕವಾಗಿದೆ.', totalSpent: 'ಒಟ್ಟು ಖರ್ಚು', saved: 'ನೀವು ಉಳಿಸಿದ್ದು', waiting: 'ನಿಮ್ಮ ಬುಟ್ಟಿ ಕಾಯುತ್ತಿದೆ', ordersEmpty: 'ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಮಾಡುವ ಆರ್ಡರ್‌ಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.', reviewsKicker: 'ಜಾಲದ ನಂಬಿಕೆ', reviewsTitle: 'ವಿಮರ್ಶೆಗಳು ಮತ್ತು', reviewsAccent: 'ಪ್ರತಿಕ್ರಿಯೆ', reviewsIntro: 'ನಿಮ್ಮ ಆಹಾರ ಬೆಳೆಯುವ ರೈತರ ಬಗ್ಗೆ ಉಪಯುಕ್ತ ಪ್ರತಿಕ್ರಿಯೆ ಹಂಚಿಕೊಳ್ಳಿ.', reviewFarmer: 'ರೈತರನ್ನು ವಿಮರ್ಶಿಸಿ', reviewPrompt: 'ಮುಂದಿನ ಖರೀದಿದಾರರಿಗೆ ಉತ್ತಮ ಆಯ್ಕೆ ಮಾಡಲು ಸಹಾಯ ಮಾಡಿ.', rating: 'ರೇಟಿಂಗ್', writeReview: 'ಈ ರೈತ ಅಥವಾ ಬೆಳೆಯ ಬಗ್ಗೆ ವಿಮರ್ಶೆ ಬರೆಯಿರಿ...', publishReview: 'ವಿಮರ್ಶೆ ಪ್ರಕಟಿಸಿ', suppliesAvailable: 'ಪೂರೈಕೆಗಳು ಲಭ್ಯವಿವೆ', stockUp: 'ಕಡಿಮೆ ಬೆಲೆಗೆ ಸಂಗ್ರಹಿಸಿ', growNext: 'ಮುಂದೆ ಬೆಳೆಯಿರಿ' },
  ml: { addProduce: 'വിള ചേർക്കുക', farmInputs: 'കാർഷിക സാമഗ്രികൾ', previousOrders: 'മുൻ ഓർഡറുകൾ', reviews: 'അവലോകനങ്ങൾ', inputsKicker: 'കാർഷിക വിതരണ വിപണി', inputsTitle: 'കാർഷിക', inputsAccent: 'സാമഗ്രികൾ', inputsIntro: 'അടുത്ത കൃഷിക്കായി വിത്തുകൾ, മണ്ണ് പരിപാലനം, വിള സംരക്ഷണം, ജലസേചനം, ഉപകരണങ്ങൾ എന്നിവ നേരിട്ട് നേടൂ.', ordersKicker: 'നിങ്ങളുടെ കൃഷിയിട ബന്ധങ്ങൾ', ordersTitle: 'ഓർഡറുകളും', ordersAccent: 'സേവിംഗ്സും', ordersIntro: 'ഓരോ ഓർഡറും നിങ്ങളുടെ ഭക്ഷണം വളർത്തുന്ന കർഷകരുമായുള്ള നേരിട്ടുള്ള ബന്ധമാണ്.', totalSpent: 'ആകെ ചെലവ്', saved: 'നിങ്ങൾ ലാഭിച്ചത്', waiting: 'നിങ്ങളുടെ ബാസ്കറ്റ് കാത്തിരിക്കുന്നു', ordersEmpty: 'മാർക്കറ്റിൽ ചെയ്യുന്ന ഓർഡറുകൾ ഇവിടെ കാണിക്കും.', reviewsKicker: 'നെറ്റ്വർക്കിലെ വിശ്വാസം', reviewsTitle: 'അവലോകനങ്ങളും', reviewsAccent: 'അഭിപ്രായങ്ങളും', reviewsIntro: 'നിങ്ങളുടെ ഭക്ഷണം വളർത്തുന്ന കർഷകരെക്കുറിച്ച് ഉപകാരപ്രദമായ അഭിപ്രായം പങ്കിടൂ.', reviewFarmer: 'കർഷകനെ അവലോകനം ചെയ്യുക', reviewPrompt: 'അടുത്ത വാങ്ങുന്നയാളെ നല്ല തിരഞ്ഞെടുപ്പിന് സഹായിക്കൂ.', rating: 'റേറ്റിംഗ്', writeReview: 'ഈ കർഷകനെക്കുറിച്ചോ വിളയെക്കുറിച്ചോ എഴുതൂ...', publishReview: 'അവലോകനം പ്രസിദ്ധീകരിക്കുക', suppliesAvailable: 'സാമഗ്രികൾ ലഭ്യമാണ്', stockUp: 'കുറഞ്ഞ വിലയ്ക്ക് ശേഖരിക്കൂ', growNext: 'അടുത്തത് വളർത്തൂ' }
};
Object.entries(interfaceTranslations).forEach(([language, labels]) => Object.assign(translations[language], labels));
const retailConnectTranslations = {
  en: { nav: 'Retail Connect', kicker: 'FARM TO RETAIL, DIRECT', title: 'Build better', titleAccent: 'farm connections.', intro: 'Retailers can discover reliable growers, discuss supply, and buy closer to the source.', status: 'OPEN TO RETAILERS', directory: 'GROWER DIRECTORY', ready: 'Farmers ready to supply', active: 'active growers', message: 'Message', conversation: 'DIRECT CONVERSATION', start: 'Start a supply conversation', ask: 'Ask about quantity, delivery, or a recurring order...', send: 'Send supply request', sent: 'Message sent to', select: 'Select a farmer to discuss supply, pricing, and delivery directly.', available: 'available', call: 'Call' },
  hi: { nav: 'खुदरा संपर्क', kicker: 'खेत से खुदरा तक, सीधे', title: 'बेहतर', titleAccent: 'किसान संपर्क बनाएं।', intro: 'खुदरा विक्रेता भरोसेमंद किसानों को खोज सकते हैं, आपूर्ति पर चर्चा कर सकते हैं और स्रोत के करीब खरीद सकते हैं।', status: 'खुदरा विक्रेताओं के लिए खुला', directory: 'किसान निर्देशिका', ready: 'आपूर्ति के लिए तैयार किसान', active: 'सक्रिय किसान', message: 'संदेश', conversation: 'सीधी बातचीत', start: 'आपूर्ति पर बातचीत शुरू करें', ask: 'मात्रा, डिलीवरी या नियमित ऑर्डर के बारे में पूछें...', send: 'आपूर्ति अनुरोध भेजें', sent: 'संदेश भेजा गया:', select: 'आपूर्ति, कीमत और डिलीवरी पर सीधे चर्चा करने के लिए किसान चुनें।', available: 'उपलब्ध', call: 'कॉल करें' },
  te: { nav: 'రిటైల్ కనెక్ట్', kicker: 'పొలం నుంచి రిటైల్‌కు, నేరుగా', title: 'మెరుగైన', titleAccent: 'రైతు అనుబంధాలు నిర్మించండి.', intro: 'రిటైలర్లు నమ్మకమైన రైతులను కనుగొని, సరఫరాపై చర్చించి, మూలానికి దగ్గరగా కొనుగోలు చేయవచ్చు.', status: 'రిటైలర్లకు అందుబాటులో ఉంది', directory: 'రైతుల డైరెక్టరీ', ready: 'సరఫరాకు సిద్ధంగా ఉన్న రైతులు', active: 'చురుకైన రైతులు', message: 'సందేశం', conversation: 'నేరుగా సంభాషణ', start: 'సరఫరా గురించి సంభాషణ ప్రారంభించండి', ask: 'పరిమాణం, డెలివరీ లేదా పునరావృత ఆర్డర్ గురించి అడగండి...', send: 'సరఫరా అభ్యర్థన పంపండి', sent: 'సందేశం పంపబడింది:', select: 'సరఫరా, ధరలు మరియు డెలివరీ గురించి నేరుగా చర్చించడానికి రైతును ఎంచుకోండి.', available: 'అందుబాటులో ఉంది', call: 'కాల్ చేయండి' },
  ta: { nav: 'சில்லறை இணைப்பு', kicker: 'பண்ணையிலிருந்து சில்லறைக்கு, நேரடியாக', title: 'சிறந்த', titleAccent: 'பண்ணைத் தொடர்புகளை உருவாக்குங்கள்.', intro: 'சில்லறை விற்பனையாளர்கள் நம்பகமான விவசாயிகளைக் கண்டறிந்து, விநியோகம் குறித்து பேசி, மூலத்திற்கு அருகில் வாங்கலாம்.', status: 'சில்லறை விற்பனையாளர்களுக்கு திறந்துள்ளது', directory: 'விவசாயிகள் அடைவு', ready: 'விநியோகத்திற்குத் தயாரான விவசாயிகள்', active: 'செயலில் உள்ள விவசாயிகள்', message: 'செய்தி', conversation: 'நேரடி உரையாடல்', start: 'விநியோகம் குறித்து உரையாடலைத் தொடங்குங்கள்', ask: 'அளவு, விநியோகம் அல்லது தொடர் ஆர்டர் பற்றி கேளுங்கள்...', send: 'விநியோகக் கோரிக்கையை அனுப்புங்கள்', sent: 'செய்தி அனுப்பப்பட்டது:', select: 'விநியோகம், விலை மற்றும் விநியோகம் குறித்து நேரடியாகப் பேச ஒரு விவசாயியைத் தேர்ந்தெடுக்கவும்.', available: 'கிடைக்கும்', call: 'அழைக்கவும்' },
  kn: { nav: 'ಚಿಲ್ಲರೆ ಸಂಪರ್ಕ', kicker: 'ಜಮೀನಿನಿಂದ ಚಿಲ್ಲರೆಗೆ, ನೇರವಾಗಿ', title: 'ಉತ್ತಮ', titleAccent: 'ರೈತ ಸಂಪರ್ಕಗಳನ್ನು ನಿರ್ಮಿಸಿ.', intro: 'ಚಿಲ್ಲರೆ ವ್ಯಾಪಾರಿಗಳು ವಿಶ್ವಾಸಾರ್ಹ ರೈತರನ್ನು ಕಂಡುಹಿಡಿದು, ಪೂರೈಕೆಯ ಕುರಿತು ಚರ್ಚಿಸಿ, ಮೂಲದ ಹತ್ತಿರದಿಂದ ಖರೀದಿಸಬಹುದು.', status: 'ಚಿಲ್ಲರೆ ವ್ಯಾಪಾರಿಗಳಿಗೆ ಮುಕ್ತವಾಗಿದೆ', directory: 'ರೈತರ ಡೈರೆಕ್ಟರಿ', ready: 'ಪೂರೈಕೆಗೆ ಸಿದ್ಧರಾಗಿರುವ ರೈತರು', active: 'ಸಕ್ರಿಯ ರೈತರು', message: 'ಸಂದೇಶ', conversation: 'ನೇರ ಸಂಭಾಷಣೆ', start: 'ಪೂರೈಕೆಯ ಕುರಿತು ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ', ask: 'ಪ್ರಮಾಣ, ವಿತರಣೆ ಅಥವಾ ಮರುಕಳಿಸುವ ಆರ್ಡರ್ ಬಗ್ಗೆ ಕೇಳಿ...', send: 'ಪೂರೈಕೆ ವಿನಂತಿ ಕಳುಹಿಸಿ', sent: 'ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಿದೆ:', select: 'ಪೂರೈಕೆ, ಬೆಲೆ ಮತ್ತು ವಿತರಣೆಯ ಕುರಿತು ನೇರವಾಗಿ ಚರ್ಚಿಸಲು ರೈತರನ್ನು ಆಯ್ಕೆಮಾಡಿ.', available: 'ಲಭ್ಯವಿದೆ', call: 'ಕರೆ ಮಾಡಿ' },
  ml: { nav: 'റീട്ടെയിൽ കണക്ട്', kicker: 'കൃഷിയിടത്തിൽ നിന്ന് റീട്ടെയിലിലേക്ക്, നേരിട്ട്', title: 'മികച്ച', titleAccent: 'കർഷക ബന്ധങ്ങൾ സൃഷ്ടിക്കൂ.', intro: 'റീട്ടെയിൽ വ്യാപാരികൾക്ക് വിശ്വസനീയരായ കർഷകരെ കണ്ടെത്തി, വിതരണത്തെക്കുറിച്ച് സംസാരിച്ച്, ഉറവിടത്തോട് അടുത്ത് വാങ്ങാം.', status: 'റീട്ടെയിൽ വ്യാപാരികൾക്കായി തുറന്നിരിക്കുന്നു', directory: 'കർഷക ഡയറക്ടറി', ready: 'വിതരണത്തിന് തയ്യാറായ കർഷകർ', active: 'സജീവ കർഷകർ', message: 'സന്ദേശം', conversation: 'നേരിട്ടുള്ള സംഭാഷണം', start: 'വിതരണ സംഭാഷണം ആരംഭിക്കൂ', ask: 'അളവ്, ഡെലിവറി അല്ലെങ്കിൽ ആവർത്തിച്ചുള്ള ഓർഡർ ചോദിക്കൂ...', send: 'വിതരണ അഭ്യർത്ഥന അയയ്ക്കൂ', sent: 'സന്ദേശം അയച്ചു:', select: 'വിതരണം, വില, ഡെലിവറി എന്നിവയെക്കുറിച്ച് നേരിട്ട് സംസാരിക്കാൻ ഒരു കർഷകനെ തിരഞ്ഞെടുക്കൂ.', available: 'ലഭ്യമാണ്', call: 'വിളിക്കൂ' }
};
function LanguageProvider({ children }) { const [language, setLanguage] = useState(() => load('farmdirect-language', 'en')); const changeLanguage = (value) => { setLanguage(value); localStorage.setItem('farmdirect-language', value); }; const t = (key) => translations[language]?.[key] || translations.en[key] || key; return <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>{children}</LanguageContext.Provider>; }
function useLanguage() { return useContext(LanguageContext); }

function App() {
  const { language, setLanguage, t } = useLanguage();
  const [produce, setProduce] = useState(() => load('farmdirect-produce', seedProduce));
  const [machinery, setMachinery] = useState(loadMachinery);
  const [machineryBookings, setMachineryBookings] = useState(() => load('farmdirect-machinery-bookings-v1', []));
  const [orders, setOrders] = useState(() => load('farmdirect-orders-v2', []));
  const [tab, setTab] = useState('market');
  const [role, setRole] = useState('consumer');
  const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [buyerType, setBuyerType] = useState('Household');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [voiceListingName, setVoiceListingName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [cart, setCart] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    localStorage.setItem('farmdirect-machinery-v2', JSON.stringify(machinery));
  }, [machinery]);
  useEffect(() => {
    localStorage.setItem('farmdirect-machinery-bookings-v1', JSON.stringify(machineryBookings));
  }, [machineryBookings]);
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return undefined; }
    let active = true;
    const loadProfile = async (session) => {
      if (!session) { if (active) { setCurrentUser(null); setRole('consumer'); setAuthLoading(false); } return; }
      try {
        const result = await getAuthenticatedProfile(session.access_token);
        if (active) { const savedBuyerType = result.user.user_metadata?.buyer_type || 'Household'; setCurrentUser({ ...result.user, ...result.profile, buyerType: savedBuyerType }); setRole(result.profile.role); setBuyerType(savedBuyerType); setAuthLoading(false); }
      } catch {
        if (active) { setCurrentUser(null); setRole('consumer'); setAuthLoading(false); }
      }
    };
    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('change-password');
        setShowAuth(true);
        setAuthLoading(false);
        return;
      }
      void loadProfile(session).catch(() => {
        if (active) { setCurrentUser(null); setRole('consumer'); setAuthLoading(false); }
      });
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);
  useEffect(() => localStorage.setItem('farmdirect-produce', JSON.stringify(produce)), [produce]);
  useEffect(() => localStorage.setItem('farmdirect-orders-v2', JSON.stringify(orders)), [orders]);
  useEffect(() => { document.body.classList.toggle('farmer-account', currentUser?.role === 'farmer'); return () => document.body.classList.remove('farmer-account'); }, [currentUser]);
  useEffect(() => {
    const handleDeliveryUpdate = (event) => updateDeliveryOrder(event.detail.id, event.detail.changes);
    window.addEventListener('farmdirect-delivery-update', handleDeliveryUpdate);
    return () => window.removeEventListener('farmdirect-delivery-update', handleDeliveryUpdate);
  });
  useEffect(() => {
    if (tab !== 'farmer') return;
    const text = farmerHubLabels[language] || farmerHubLabels.en;
    const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
    setText('.farmer-header .eyebrow', text.kicker);
    setText('.farmer-header h1', `${text.title} ${text.accent}`);
    setText('.farmer-header p', text.intro);
    setText('.farmer-header .primary-button', text.add);
    document.querySelectorAll('.dashboard-stats small').forEach((element, index) => { element.textContent = [text.active, text.revenue, text.received, text.reach][index] || element.textContent; });
    const reach = document.querySelector('.dashboard-stats > div:nth-child(4) strong');
    if (reach) reach.textContent = `${new Set(orders.map((order) => order.buyer)).size || 0} ${text.buyers}`;
    const panels = document.querySelectorAll('.hub-grid .hub-panel');
    if (panels[0]) { setText('.hub-grid .hub-panel:nth-child(1) .eyebrow', text.harvest); setText('.hub-grid .hub-panel:nth-child(1) h2', text.listings); setText('.hub-grid .hub-panel:nth-child(1) .panel-heading > span', `${produce.length} ${text.crops}`); }
    if (panels[1]) { setText('.hub-grid .hub-panel:nth-child(2) .eyebrow', text.incoming); setText('.hub-grid .hub-panel:nth-child(2) h2', text.recent); }
    const empty = document.querySelector('.hub-panel.incoming .mini-empty');
    if (empty) empty.lastChild.textContent = ` ${text.empty}`;
    document.querySelectorAll('.listing-row').forEach((row, index) => { const item = localizeProduce(produce[index], language); const name = row.querySelector('strong'); const details = row.querySelector('span'); if (name) name.textContent = item.name; if (details) details.textContent = `${item.quantity} ${item.unitLabel || item.unit} ${text.available} · ${money(item.farmPrice)}/${item.unitLabel || item.unit}`; });
  }, [language, tab, produce, orders]);
  useEffect(() => {
    const labels = interfaceTranslations[language] || interfaceTranslations.en;
    const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
    if (tab === 'orders') {
      setText('.content-page .page-header .eyebrow', labels.ordersKicker);
      setText('.content-page .page-header h1', `${labels.ordersTitle} ${labels.ordersAccent}`);
      setText('.content-page .page-header p', labels.ordersIntro);
      document.querySelectorAll('.stat-cluster small').forEach((element, index) => { element.textContent = [labels.totalSpent, labels.saved][index] || element.textContent; });
      setText('.empty-orders h2', labels.waiting);
      setText('.empty-orders p', labels.ordersEmpty);
    }
    if (tab === 'inputs') {
      setText('.content-page .page-header .eyebrow', labels.inputsKicker);
      setText('.content-page .page-header h1', `${labels.inputsTitle} ${labels.inputsAccent}`);
      setText('.content-page .page-header p', labels.inputsIntro);
      setText('.input-shop .eyebrow', labels.growNext);
      setText('.input-shop h2', labels.stockUp);
      const count = document.querySelector('.input-shop .panel-heading > span');
      if (count) count.textContent = `${farmInputs.length} ${labels.suppliesAvailable}`;
    }
    if (tab === 'reviews') {
      setText('.content-page .page-header .eyebrow', labels.reviewsKicker);
      setText('.content-page .page-header h1', `${labels.reviewsTitle} ${labels.reviewsAccent}`);
      setText('.content-page .page-header p', labels.reviewsIntro);
      setText('.review-form .panel-kicker', labels.reviewFarmer);
      setText('.review-form h2', labels.reviewPrompt);
      setText('.review-form label:nth-of-type(2) span', labels.rating);
      const reviewBox = document.querySelector('.review-form textarea');
      if (reviewBox) reviewBox.placeholder = labels.writeReview;
      const publish = document.querySelector('.review-form .primary-button');
      if (publish) publish.lastChild.textContent = ` ${labels.publishReview}`;
    }
  }, [language, tab]);
  const filtered = useMemo(() => produce.filter((item) => {
       const haystack = `${item.name} ${item.farmer} ${item.location} ${item.category}`.toLowerCase();
    return (category === 'All' || item.category === category) && haystack.includes(query.toLowerCase());
       }), [produce, query, category]);
  const verifyPaymentBeforeOrder = async (amount, receipt, paymentMethod) => {
    if (paymentMethod === 'Cash on Delivery') return true;
    const apiUrl = DELIVERY_API_URL;
    const createResponse = await fetch(`${apiUrl}/api/payments/create`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ amount, receipt }) });
    const payment = await createResponse.json();
    if (!createResponse.ok) throw new Error(payment.error || 'Payment service unavailable.');
    if (payment.mode === 'development') {
      const response = await fetch(`${apiUrl}/api/payments/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ orderId: payment.id, paymentId: `dev_payment_${receipt}` }) });
      if (!response.ok) throw new Error('Development payment verification failed.');
      return true;
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const checkout = new window.Razorpay({ key: payment.keyId, amount: payment.amount, currency: payment.currency, name: 'Farmers A to Z', description: 'Direct farm order', order_id: payment.id, handler: async (result) => { const response = await fetch(`${apiUrl}/api/payments/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature }) }); response.ok ? resolve() : reject(new Error('Payment signature could not be verified.')); }, modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) } });
        checkout.on('payment.failed', () => reject(new Error('Payment failed.')));
        checkout.open();
      };
      script.onerror = () => reject(new Error('Unable to load the payment provider.'));
      document.body.appendChild(script);
    });
    return true;
  };
  const placeOrder = async (item, quantity, buyer, address, distanceKm, deliveryWindow, paymentMethod, buyerType) => {
    const placedAt = new Date();
    const deliveryCharge = distanceKm * deliveryChargePerKm;
    const pricing = calculateDemandPrice(item, { buyerType, quantity, orders, distanceKm });
    const productTotal = pricing.unitPrice * quantity;
    const order = { id: Date.now(), itemId: item.id, name: item.name, photo: item.photo || produceImages[item.id] || '', farm: item.farm, farmer: item.farmer, quantity, unit: item.unit, unitPrice: pricing.unitPrice, priceFactors: pricing.factors, weightKg: item.unit === 'kg' ? quantity : quantity * 5, total: productTotal + deliveryCharge, productTotal, deliveryCharge, distanceKm, middlemanTotal: item.middlemanPrice * quantity, savings: Math.max(0, item.middlemanPrice - pricing.unitPrice) * quantity, buyer, buyerType, address, deliveryWindow, paymentMethod, pickup: { lat: 17.385, lng: 78.4867 }, dropoff: { lat: 17.41, lng: 78.47 }, placedAt: placedAt.toISOString(), date: placedAt.toLocaleDateString('en-IN'), estimatedDelivery: deliveryWindow === '30 minutes' ? new Date(placedAt.getTime() + 30 * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : deliveryWindow, status: 'Awaiting assignment', partner: '' };
    try { await verifyPaymentBeforeOrder(order.total, order.id, paymentMethod); } catch (error) { window.alert(error.message); return; }
    setOrders((current) => [order, ...current]);
    void confirmDelivery(order);
    setProduce((current) => current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity - quantity } : entry));
    setSelected(null); setTab('market');
  };
  const checkoutCart = async (items, buyer, address, distanceKm, deliveryWindow, paymentMethod, buyerType) => {
    const placedAt = new Date();
    const deliveryCharge = distanceKm * deliveryChargePerKm;
    const paymentAmount = items.reduce((sum, item) => sum + calculateDemandPrice(item, { buyerType, quantity: item.cartQuantity || 1, orders, distanceKm }).unitPrice * (item.cartQuantity || 1), 0) + deliveryCharge;
    const newOrders = items.map((item, index) => {
      const pricing = calculateDemandPrice(item, { buyerType, quantity: item.cartQuantity || 1, orders, distanceKm });
      const unitPrice = pricing.unitPrice;
      const marketPrice = item.middlemanPrice || unitPrice;
      const quantity = item.cartQuantity || 1;
      return { id: Date.now() + index, itemId: item.id, name: item.name, photo: item.photo || produceImages[item.id] || '', farm: item.farm || 'FarmDirect Inputs', farmer: item.farmer || 'FarmDirect Network', quantity, unit: item.unit || 'item', unitPrice, priceFactors: pricing.factors, weightKg: item.unit === 'kg' ? quantity : quantity * 5, total: unitPrice * quantity + deliveryCharge, productTotal: unitPrice * quantity, deliveryCharge, distanceKm, middlemanTotal: marketPrice * quantity, savings: Math.max(0, marketPrice - unitPrice) * quantity, buyer, buyerType, address, deliveryWindow, paymentMethod, pickup: { lat: 17.385, lng: 78.4867 }, dropoff: { lat: 17.41, lng: 78.47 }, placedAt: placedAt.toISOString(), date: placedAt.toLocaleDateString('en-IN'), estimatedDelivery: deliveryWindow, status: 'Awaiting assignment', partner: '' };
    });
    try { await verifyPaymentBeforeOrder(paymentAmount, newOrders[0].id, paymentMethod); } catch (error) { window.alert(error.message); return; }
    setOrders((current) => [...newOrders, ...current]);
    newOrders.forEach((order) => { void confirmDelivery(order); });
    setCart([]);
    setTab('market');
  };
  const addListing = (listing) => { setProduce((current) => [{ ...listing, id: Date.now(), color: 'leaf' }, ...current]); setShowAdd(false); setTab('farmer'); };
  const updateDeliveryOrder = (id, changes) => setOrders((current) => current.map((order) => order.id === id ? { ...order, ...changes } : order));
  const confirmDelivery = async (order) => { try { const response = await fetch(`${DELIVERY_API_URL}/api/orders/${order.id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify(order) }); if (!response.ok) return; const result = await response.json(); setOrders((current) => current.map((entry) => entry.id === order.id ? { ...entry, assignmentId: result.assignment.id, deliveryStatus: result.assignment.status, vehicleRecommendation: result.assignment.vehicleRecommendation } : entry)); } catch { return; } };
  const handleAuth = (user) => { setCurrentUser(user); setRole(user.role); if (user.role === 'consumer' && user.buyerType) setBuyerType(user.buyerType); setShowAuth(false); setTab(user.role === 'customer_care' ? 'customer-care' : user.role === 'delivery_partner' ? 'operations' : user.role === 'farmer' ? 'farmer' : user.role === 'admin' ? 'admin' : 'market'); };
  const handleLogout = async () => { await supabase?.auth.signOut(); setCurrentUser(null); setRole('consumer'); setTab('market'); };
  const requireLogin = (action) => { if (!currentUser) { setAuthMode('login'); setShowAuth(true); return; } action(); };
  const addToCart = (item) => setCart((current) => [...current, { ...item, cartId: `${item.id}-${Date.now()}`, cartQuantity: 1 }]);
  const handleProduceSelect = (item) => requireLogin(() => setSelected({ ...item, buyerType }));
  const handleRoleChange = () => { if (currentUser?.role !== 'farmer') return; const nextMode = role === 'farmer' ? 'consumer' : 'farmer'; setRole(nextMode); setTab(nextMode === 'farmer' ? 'farmer' : 'market'); };
  const navItems = role === 'delivery_partner'
    ? [['operations', 'Delivery dashboard', Truck]]
    : role === 'customer_care'
    ? [['customer-care', 'Customer care', Headphones]]
    : role === 'admin'
    ? [['admin', 'Admin dashboard', ShieldCheck], ['customer-care', 'Customer care', Headphones]]
    : role === 'farmer'
    ? [['farmer', t('farmer'), Sprout], ['nearby-markets', 'Nearby markets', MapPin], ['add-listing', t('addProduce'), Plus], ['machinery', 'Machinery share', TractorIcon], ['inputs', t('farmInputs'), Store], ['radar', t('radar'), Radar], ['orders', t('previousOrders'), Truck], ['reviews', t('reviews'), Star]]
    : [['market', householdLabels[language] || householdLabels.en, Store], ['retail-connect', 'Retail Connect', Store], ['orders', t('previousOrders'), Truck], ['reviews', t('reviews'), Star]];
  return <div className="app-shell"><VoiceNavigationAssistant language={language} onNavigate={setTab} onAddListing={() => setShowAdd(true)} />
    <header className="topbar"><div className="brand" onClick={() => setTab(role === 'customer-care' ? 'customer-care' : role === 'delivery' ? 'operations' : role === 'farmer' ? 'farmer' : 'market')}><div className="brand-mark farmer-logo" aria-label="Indian farmer logo"><span role="img" aria-label="Indian farmer">👨🏾‍🌾</span></div><span>Farmers <span>A to Z</span></span></div><nav className="desktop-nav">{navItems.map(([key, label, Icon]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => key === 'add-listing' ? setShowAdd(true) : setTab(key)}><Icon size={17} />{label}{key === 'orders' && orders.length > 0 && <b className="nav-count">{orders.length}</b>}</button>)}</nav><div className="top-actions"><label className="language-switcher"><span> भाषा / భాష</span><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Choose language"><option value="en">English</option><option value="hi">हिन्दी</option><option value="te">తెలుగు</option><option value="ta">தமிழ்</option><option value="kn">ಕನ್ನಡ</option><option value="ml">മലയാളം</option></select></label><button className="cart-button" onClick={() => requireLogin(() => setTab('cart'))} title="Open cart"><ShoppingBasket size={16} /><span>Cart</span>{cart.length > 0 && <b>{cart.length}</b>}</button><button className={`role-switch ${role}-mode`} onClick={handleRoleChange} aria-label={`Switch to ${role === 'consumer' ? 'farmer' : 'consumer'} mode`}><UserRound size={15} /><span>{role === 'consumer' ? 'Consumer mode' : role === 'farmer' ? 'Farmer mode' : role === 'customer-care' ? 'Customer care' : 'Delivery partner'}</span><ChevronDown size={14} /></button>{currentUser ? <button className="account-button" onClick={handleLogout} title="Log out"><LogOut size={15} /> {currentUser.name}</button> : <button className="account-button" onClick={() => { setAuthMode('login'); setShowAuth(true); }}><LogIn size={15} /> {t('login')}</button>}<button className="mobile-menu"><Menu size={20} /></button></div></header>
    <main>{tab === 'market' && <Marketplace produce={filtered} orders={orders} query={query} setQuery={setQuery} category={category} setCategory={setCategory} buyerType={buyerType} setBuyerType={setBuyerType} onSelect={handleProduceSelect} onAddToCart={(item) => requireLogin(() => addToCart({ ...item, buyerType }))} />}{tab === 'retail-connect' && <RetailConnect produce={produce} />}{tab === 'nearby-markets' && <NearbyMarkets produce={produce} />}{tab === 'inputs' && <AgriculturalInputs onBuyInput={(item) => requireLogin(() => addToCart(item))} />}{tab === 'machinery' && <MachinerySharing machinery={machinery} bookings={machineryBookings} onAddMachine={(item) => setMachinery((current) => [{ ...item, id: Date.now() }, ...current])} onRequestMachine={(request) => setMachineryBookings((current) => [{ ...request, id: Date.now() }, ...current])} />}{tab === 'radar' && <DemandRadarData produce={produce} orders={orders} />}{tab === 'calculator' && <Calculator />}{tab === 'orders' && <Orders orders={orders} onUpdateOrder={updateDeliveryOrder} />}{tab === 'cart' && <Cart items={cart} orders={orders} onCheckout={checkoutCart} />}{tab === 'operations' && <OperationsDashboard orders={orders} onAssign={(id, partner) => setOrders((current) => current.map((order) => order.id === id ? { ...order, partner, status: 'Assigned to delivery partner' } : order))} />}{tab === 'customer-care' && <CustomerCareDashboard orders={orders} produce={produce} />}{tab === 'reviews' && <Reviews />} {tab === 'farmer' && <><FarmerHubWithVoice produce={produce} orders={orders} onAdd={() => setShowAdd(true)} onNavigate={setTab} onVoiceAdd={(name) => { setShowAdd(true); setVoiceListingName(name); }} onDelete={(id) => setProduce((current) => current.filter((item) => item.id !== id))} onUpdateOrder={updateDeliveryOrder} /><FarmerSuggestions produce={produce} /></>}</main>
    {tab === 'admin' && <AdminDashboard />}
    {/*
    function DemandRadarData({ produce, orders }) {
      const [query, setQuery] = useState('');
      const [result, setResult] = useState(null);
      const [loading, setLoading] = useState(false);
      const search = async (event) => { event.preventDefault(); setLoading(true); try { const response = await fetch(`${import.meta.env.VITE_DELIVERY_API_URL || 'http://localhost:8787'}/api/demand-radar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, produce, orders }) }); if (!response.ok) throw new Error('Demand service unavailable'); setResult(await response.json()); } catch { setResult({ error: 'Connect the delivery service to load live demand signals.' }); } finally { setLoading(false); } };
      useEffect(() => { void search({ preventDefault: () => {} }); }, []);
      return <section className="radar-page page-enter"><div className="radar-heading"><div><div className="eyebrow"><span></span> AI-POWERED MARKET SIGNALS</div><h1>Demand radar</h1><p>Recommendations are calculated from inventory and completed orders, then ranked on the server.</p></div><div className="radar-status"><span></span> SERVER SIGNALS <small>{result?.generatedAt ? new Date(result.generatedAt).toLocaleTimeString() : 'Loading'}</small></div></div><form className="radar-search" onSubmit={search}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search crops or states, e.g. Telangana tomatoes" /><button className="ai-search-button" type="submit"><Radar size={13} /> {loading ? 'ANALYZING' : 'ANALYZE'}</button></form>{result?.error ? <div className="radar-insights"><p>{result.error}</p></div> : <div className="radar-layout"><div className="radar-map-panel"><div className="radar-panel-top"><div><span className="panel-kicker">LIVE INVENTORY MODEL</span><h2>Highest pressure markets</h2></div><span>{result?.signalsAnalyzed || 0} signals</span></div><div className="city-list">{(result?.signals || []).map((signal) => <div className="city-row selected" key={`${signal.city.name}-${signal.name}`}><span className={`city-dot ${signal.level}`}></span><div><strong>{signal.name} · {signal.city.name}</strong><small>{signal.state} · {signal.evidence}</small></div><b>{signal.change}</b><ArrowRight size={14} /></div>)}</div></div><aside className="radar-insights"><div className="insight-header"><div><span className="panel-kicker">SERVER AI READOUT</span><h2>What to grow next</h2></div><Radar size={20} /></div>{result?.signals?.[0] ? <div className="radar-callout"><div className="signal-icon"><TrendingDown size={18} /></div><div><strong>Prioritize {result.signals[0].name}</strong><p>{result.signals[0].city.name} has the strongest observed demand pressure.</p></div><b>{result.signals[0].score}</b></div> : <p>Search the tracked inventory and order history for a recommendation.</p>}<div className="radar-footer"><MapPin size={15} /> {result?.trackedMarkets || 0} markets tracked <span>•</span> {result?.signalsAnalyzed || 0} observed signals</div></aside></div>}</section>;
    }

    function Calculator() { const [quantity, setQuantity] = useState(12); const farmPrice = 22 * quantity; const marketPrice = 45 * quantity; const saved = marketPrice - farmPrice; return <section className="tool-page page-enter"><div className="tool-intro"><div className="eyebrow"><span></span> SEE THE DIFFERENCE</div><h1>What does the middleman<br /><em>really cost you?</em></h1><p>Move the dial. Watch the extra layers disappear from your basket and your bill.</p></div><div className="calculator-layout"><div className="calculator-panel"><div className="panel-top"><span>CALCULATE YOUR SAVINGS</span><TrendingDown size={18} /></div><div className="quantity-display"><small>BUYING</small><strong>{quantity}<i> kg</i></strong><span>of vine tomatoes</span></div><input className="range" type="range" min="1" max="100" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /><div className="range-labels"><span>1 kg</span><span>100 kg</span></div><div className="price-compare"><div><span>Typical retail price</span><strong className="struck">{money(marketPrice)}</strong><small>includes 51% of middleman layers</small></div><div className="arrow-separator"><ArrowRight size={18} /></div><div className="fair-price"><span>Farmers A to Z price</span><strong>{money(farmPrice)}</strong><small>paid straight to the farm</small></div></div><div className="saved-total"><div><Zap size={18} /><span>You keep</span></div><strong>{money(saved)}</strong><small>in your pocket</small></div></div><div className="flow-panel"><div className="eyebrow muted">WHERE YOUR MONEY GOES</div><h2>One clean connection.</h2><p>With Farmers A to Z, your money travels a shorter, clearer distance.</p><div className="money-flow"><div className="flow-node farmer-node"><div><Sprout size={24} /></div><span>Farmer</span><strong>{money(farmPrice)}</strong></div><div className="flow-line direct"><span>100% of farm price</span></div><div className="flow-node buyer-node"><div><ShoppingBasket size={24} /></div><span>You</span><strong>{money(marketPrice)}</strong></div></div></div></div></section>; }
    */}<div className="mobile-nav">{navItems.map(([key, label, Icon]) => <button className={tab === key ? 'active' : ''} aria-label={label} key={key} onClick={() => key === 'add-listing' ? setShowAdd(true) : setTab(key)}><Icon size={19} /><span>{label}</span></button>)}</div>
    {selected && <OrderModal item={selected} onClose={() => setSelected(null)} onPlace={placeOrder} />}{showAdd && <AddListing initialName={voiceListingName} language={language} onClose={() => { setShowAdd(false); setVoiceListingName(''); }} onAdd={addListing} />}{showAuth && <AuthModal mode={authMode} onModeChange={setAuthMode} onClose={() => setShowAuth(false)} onAuthenticated={handleAuth} />}
  </div>;
}

function LegacyDemandRadarData({ produce, orders }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const search = async (event) => { event.preventDefault(); setLoading(true); try { const response = await fetch(`${DELIVERY_API_URL}/api/demand-radar`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ query, produce, orders }) }); if (!response.ok) throw new Error('Demand service unavailable'); setResult(await response.json()); } catch { setResult({ error: 'Connect the delivery service to load live demand signals.' }); } finally { setLoading(false); } };
  useEffect(() => { void search({ preventDefault: () => {} }); }, []);
  const signals = result?.signals || [];
  const mapSignals = signals.filter((signal) => signal.city?.lat && signal.city?.lng).map((signal) => ({ ...signal, position: { left: `${12 + ((signal.city.lng - 68) / 23) * 76}%`, top: `${8 + ((35 - signal.city.lat) / 27) * 84}%` } }));
  const selectedCrop = query.trim() || signals[0]?.name || 'All crops';
  return <section className="radar-page page-enter"><div className="radar-heading"><div><div className="eyebrow"><span></span> AI-POWERED MARKET SIGNALS</div><h1>Demand radar</h1><p>Recommendations are calculated from inventory and completed orders, then ranked on the server.</p></div><div className="radar-status"><span></span> SERVER SIGNALS <small>{result?.generatedAt ? new Date(result.generatedAt).toLocaleTimeString() : 'Loading'}</small></div></div><form className="radar-search" onSubmit={search}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search crops or states, e.g. Telangana tomatoes" /><button className="ai-search-button" type="submit"><Radar size={13} /> {loading ? 'ANALYZING' : 'ANALYZE'}</button></form>{result?.error ? <div className="radar-insights"><p>{result.error}</p></div> : <div className="radar-layout"><div className="radar-map-panel"><div className="radar-panel-top"><div><span className="panel-kicker">LIVE INVENTORY MODEL</span><h2>Highest pressure markets</h2></div><span>{result?.signalsAnalyzed || 0} signals</span></div><div className="city-list">{(result?.signals || []).map((signal) => <div className="city-row selected" key={`${signal.city.name}-${signal.name}`}><span className={`city-dot ${signal.level}`}></span><div><strong>{signal.name} · {signal.city.name}</strong><small>{signal.state} · {signal.evidence}</small></div><b>{signal.change}</b><ArrowRight size={14} /></div>)}</div></div><aside className="radar-insights"><div className="insight-header"><div><span className="panel-kicker">SERVER AI READOUT</span><h2>What to grow next</h2></div><Radar size={20} /></div>{result?.signals?.[0] ? <div className="radar-callout"><div className="signal-icon"><TrendingDown size={18} /></div><div><strong>Prioritize {result.signals[0].name}</strong><p>{result.signals[0].city.name} has the strongest observed demand pressure.</p></div><b>{result.signals[0].score}</b></div> : <p>Search the tracked inventory and order history for a recommendation.</p>}<div className="radar-footer"><MapPin size={15} /> {result?.trackedMarkets || 0} markets tracked <span>•</span> {result?.signalsAnalyzed || 0} observed signals</div></aside></div>}</section>;
}

function DemandRadarData({ produce, orders }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const search = async (event) => { event.preventDefault(); setLoading(true); try { const response = await fetch(`${DELIVERY_API_URL}/api/demand-radar`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ query, produce, orders }) }); if (!response.ok) throw new Error('Demand service unavailable'); setResult(await response.json()); } catch { setResult({ error: 'Connect the delivery service to load live demand signals.' }); } finally { setLoading(false); } };
  useEffect(() => { void search({ preventDefault: () => {} }); }, []);
  const signals = result?.signals || [];
  const mapSignals = signals.filter((signal) => signal.city?.lat && signal.city?.lng).map((signal) => ({ ...signal, position: { left: `${12 + ((signal.city.lng - 68) / 23) * 76}%`, top: `${8 + ((35 - signal.city.lat) / 27) * 84}%` } }));
  const selectedCrop = query.trim() || signals[0]?.name || 'All crops';
  return <section className="radar-page page-enter"><div className="radar-heading"><div><div className="eyebrow"><span></span> AI-POWERED MARKET SIGNALS</div><h1>Demand radar</h1><p>Search a fruit or vegetable to see its demand percentage across Indian markets.</p></div><div className="radar-status"><span></span> SERVER SIGNALS <small>{result?.generatedAt ? new Date(result.generatedAt).toLocaleTimeString() : 'Loading'}</small></div></div><form className="radar-search" onSubmit={search}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a crop, e.g. tomatoes or mangoes" /><button className="ai-search-button" type="submit"><Radar size={13} /> {loading ? 'ANALYZING' : 'ANALYZE'}</button></form>{result?.error ? <div className="radar-insights"><p>{result.error}</p></div> : <div className="radar-layout"><div className="radar-map-panel"><div className="radar-panel-top"><div><span className="panel-kicker">INDIA CROP DEMAND</span><h2>{selectedCrop} by market</h2></div><div className="radar-legend"><span><i className="low"></i> 1-44%</span><span><i className="medium"></i> 45-69%</span><span><i className="high"></i> 70-99%</span></div></div><div className="radar-map india-map" aria-label={`India map showing ${selectedCrop} demand percentages`}><div className="map-grid"></div><div className="state-shape india-shape"><span></span></div><div className="state-label">INDIA</div>{mapSignals.map((signal) => <div className={`map-pin ${signal.level}`} key={`${signal.city.name}-${signal.name}`} style={signal.position}><span></span><b>{signal.city.name}<strong>{signal.score}%</strong></b></div>)}{signals[0] && <div className="map-callout"><span>TOP MARKET</span><strong>{signals[0].name}</strong><b>{signals[0].score}% in {signals[0].city.name}</b><ArrowRight size={15} /></div>}</div><div className="city-list">{signals.map((signal) => <div className="city-row selected" key={`${signal.city.name}-${signal.name}`}><span className={`city-dot ${signal.level}`}></span><div><strong>{signal.name} · {signal.city.name}</strong><small>{signal.state} · {signal.evidence}</small></div><b>{signal.score}%</b><ArrowRight size={14} /></div>)}</div></div><aside className="radar-insights"><div className="insight-header"><div><span className="panel-kicker">SERVER AI READOUT</span><h2>What to grow next</h2></div><Radar size={20} /></div>{signals[0] ? <div className="radar-callout"><div className="signal-icon"><TrendingDown size={18} /></div><div><strong>Prioritize {signals[0].name}</strong><p>{signals[0].city.name} has the strongest observed demand pressure.</p></div><b>{signals[0].score}%</b></div> : <p>Search the tracked inventory to see a recommendation.</p>}<div className="radar-footer"><MapPin size={15} /> {result?.trackedMarkets || 0} state markets tracked <span>•</span> {result?.signalsAnalyzed || 0} signals analyzed</div></aside></div>}</section>;
}

function Marketplace({ produce, orders, query, setQuery, category, setCategory, buyerType, setBuyerType, showBuyerType, onSelect, onAddToCart }) {
  const { language, t } = useLanguage();
  const localizedProduce = produce.map((item) => ({ ...localizeProduce(item, language), buyerType, orders }));
  return <section className="market-page page-enter"><div className="hero-band"><div className="hero-copy"><div className="eyebrow"><span></span> {t('directSource')}</div><h1>{t('goodFood')}<br /><em>{t('fairlyPriced')}</em></h1><p>Meet the farmers behind your food. Buy fresh produce at farm-gate prices, with every rupee accounted for.</p><button className="primary-button" onClick={() => document.querySelector('.listing-section')?.scrollIntoView({ behavior: 'smooth' })}>{t('explore')} <ArrowRight size={17} /></button></div><div className="hero-art"><div className="sun"></div><div className="field field-one"></div><div className="field field-two"></div><span className="hero-label">THIS WEEK'S<br /><strong>FRESH PICK</strong></span><span className="hero-stamp">0%<small>MIDDLEMEN</small></span></div></div><div className="trust-row"><div><Check size={16} /> Prices set by farmers</div><div><Leaf size={16} /> Freshness you can trace</div><div><CircleDollarSign size={16} /> Average savings 38%</div></div><div className="listing-section"><div className="section-heading"><div><div className="eyebrow muted">{t('weeklyHarvest')}</div><h2>{t('findStaple')}</h2></div><span className="result-count">{produce.length} listings near you</span></div><div className="buyer-switch"><span>Buying for</span>{buyerTypes.map((type) => <button key={type} className={buyerType === type ? 'selected' : ''} onClick={() => setBuyerType(type)}>{type}</button>)}</div><div className="toolbar"><label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchProduce')} /></label><div className="category-row">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div className="produce-grid">{localizedProduce.map((item) => <ProduceCard key={item.id} item={item} onSelect={onSelect} onAddToCart={onAddToCart} />)}</div>{produce.length === 0 && <div className="empty-state">No harvests match that search. Try another crop or place.</div>}</div></section>;
  return <section className="market-page page-enter"><div className="hero-band"><div className="hero-copy"><div className="eyebrow"><span></span> {t('directSource')}</div><h1>{t('goodFood')}<br /><em>{t('fairlyPriced')}</em></h1><p>Meet the farmers behind your food. Buy fresh produce at farm-gate prices, with every rupee accounted for.</p><button className="primary-button" onClick={() => document.querySelector('.listing-section')?.scrollIntoView({ behavior: 'smooth' })}>{t('explore')} <ArrowRight size={17} /></button></div><div className="hero-art"><div className="sun"></div><div className="field field-one"></div><div className="field field-two"></div><span className="hero-label">THIS WEEK'S<br /><strong>FRESH PICK</strong></span><span className="hero-stamp">0%<small>MIDDLEMEN</small></span></div></div><div className="trust-row"><div><Check size={16} /> Prices set by farmers</div><div><Leaf size={16} /> Freshness you can trace</div><div><CircleDollarSign size={16} /> Average savings 38%</div></div><div className="listing-section"><div className="section-heading"><div><div className="eyebrow muted">{t('weeklyHarvest')}</div><h2>{t('findStaple')}</h2></div><span className="result-count">{produce.length} listings near you</span></div><div className="buyer-switch"><span>Buying for</span>{buyerTypes.map((type) => <button key={type} className={buyerType === type ? 'selected' : ''} onClick={() => setBuyerType(type)}>{type}</button>)}</div><div className="toolbar"><label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchProduce')} /><VoiceInputButton onTranscript={(text) => setQuery((current) => `${current} ${text}`.trim())} /></label><div className="category-row">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div className="produce-grid">{localizedProduce.map((item) => <ProduceCard key={item.id} item={item} onSelect={onSelect} onAddToCart={onAddToCart} />)}</div>{produce.length === 0 && <div className="empty-state">No harvests match that search. Try another crop or place.</div>}</div></section>;
}

function VoiceInputButton({ onTranscript, language = 'en-IN' }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const supported = Boolean(speechRecognition());
  useEffect(() => () => {
    if (recognitionRef.current === activeVoiceRecognition) activeVoiceRecognition = null;
    recognitionRef.current?.abort();
  }, []);
  const toggle = () => {
    if (!supported) return;
    if (listening) { recognitionRef.current?.abort(); return; }
    activeVoiceRecognition?.abort();
    const Recognition = speechRecognition();
    const recognition = new Recognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) onTranscript(transcript);
      recognition.abort();
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) setListening(false);
      if (activeVoiceRecognition === recognition) activeVoiceRecognition = null;
    };
    recognition.onerror = () => {
      if (recognitionRef.current === recognition) setListening(false);
      if (activeVoiceRecognition === recognition) activeVoiceRecognition = null;
    };
    recognitionRef.current = recognition;
    activeVoiceRecognition = recognition;
    setListening(true);
    try { recognition.start(); } catch { setListening(false); if (activeVoiceRecognition === recognition) activeVoiceRecognition = null; }
  };
  return <button type="button" className={`voice-button ${listening ? 'listening' : ''}`} onClick={toggle} disabled={!supported} title={supported ? (listening ? 'Stop listening' : 'Speak') : 'Voice input is not supported in this browser'} aria-label={supported ? (listening ? 'Stop listening' : 'Speak') : 'Voice input unavailable'}>{listening ? <MicOff size={16} /> : <Mic size={16} />}</button>;
}

function ProduceCard({ item, buyerType, orders, onSelect, onAddToCart }) { const activeBuyerType = buyerType || item.buyerType || 'Household'; const pricing = calculateDemandPrice(item, { buyerType: activeBuyerType, orders: orders || item.orders || [] }); const savings = Math.round(((item.middlemanPrice - pricing.unitPrice) / item.middlemanPrice) * 100); const image = item.photo || produceImages[item.id]; return <article className="produce-card"><div className={`produce-image ${item.color}`} onClick={() => onSelect(item)}>{image ? <img className="produce-photo" src={image} alt={item.name} /> : <div className="produce-illustration"><span></span><span></span><span></span></div>}<span className="category-label">{item.category}</span>{item.organic && <span className="organic-label"><Leaf size={12} /> ORGANIC</span>}</div><div className="produce-body"><div className="produce-title"><div><h3>{item.name}</h3><p>{item.farm}</p></div><span className="savings-pill">-{Math.max(0, savings)}%</span></div><div className="location"><MapPin size={13} /> {item.location}</div><div className="freshness-line"><span>Freshness {item.freshnessScore || 'Verified'}</span><span>{item.pickedStatus || item.harvest || 'Harvested recently'}</span>{item.expiryDate && <span>Best before {new Date(`${item.expiryDate}T00:00:00`).toLocaleDateString('en-IN')}</span>}</div><div className="price-line"><div><strong>{money(pricing.unitPrice)}</strong><span> / {item.unitLabel || item.unit}</span><del>{money(item.middlemanPrice)}</del><small className="ai-price-note">AI price for {activeBuyerType.toLowerCase()}s</small></div><button className="buy-button" disabled={item.quantity <= 0} onClick={() => onAddToCart(item)}>{item.quantity > 0 ? 'Add to cart' : 'Sold out'} <ShoppingBasket size={15} /></button></div></div></article>; }

function RetailConnect({ produce }) {
  const { language } = useLanguage();
  const text = retailConnectTranslations[language] || retailConnectTranslations.en;
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [message, setMessage] = useState('');
  const [sentFarmer, setSentFarmer] = useState('');
  const farmers = Object.values(produce.filter((item) => item.category === 'Vegetables' && item.quantity > 0).reduce((groups, item) => {
    const current = groups[item.farmer] || { id: item.farmer, farmer: item.farmer, farm: item.farm, location: item.location, color: item.color, farmType: item.organic ? 'Organic' : 'Conventional', phone: item.farmerPhone || (item.farmer === 'Ramesh Patel' ? '+919876543210' : '+919812345678'), produce: [] };
    current.produce.push(item);
    groups[item.farmer] = current;
    return groups;
  }, {}));
  const openWhatsApp = (farmer, messageText = '') => { if (!farmer) return; window.open(whatsappLink(farmer.phone, messageText), '_blank', 'noopener,noreferrer'); };
  const sendMessage = (event) => { event.preventDefault(); if (!message.trim() || !selectedFarmer) return; openWhatsApp(selectedFarmer, message); setSentFarmer(selectedFarmer.farmer); setMessage(''); };
  return <section className="connect-page page-enter">
    <div className="connect-heading"><div><div className="eyebrow"><span></span> {text.kicker}</div><h1>{text.title} <em>{text.titleAccent}</em></h1><p>{text.intro}</p></div><div className="connect-status"><span></span> {text.status}</div></div>
    <div className="connect-grid"><div className="farmer-directory"><div className="directory-top"><div><span className="panel-kicker">{text.directory}</span><h2>{text.ready}</h2></div><span>{farmers.length} {text.active}</span></div>{farmers.map((farmer) => <article className={`farmer-card ${selectedFarmer?.id === farmer.id ? 'selected' : ''}`} key={farmer.id}><div className={`farmer-avatar ${farmer.color}`}><Sprout size={23} /></div><div className="farmer-card-main"><div><h3>{farmer.farmer}</h3><p>{farmer.farm}</p></div><span className="farmer-location"><MapPin size={12} /> {farmer.location.split(',')[0]}</span><span className="farmer-location"><Leaf size={12} /> {farmer.farmType} farm</span><div className="supply-line"><strong>{farmer.produce.map((item) => item.name).join(', ')}</strong><span>{farmer.produce.reduce((total, item) => total + item.quantity, 0)} kg {text.available}</span></div></div><div className="farmer-card-actions"><button className="connect-button" onClick={() => setSelectedFarmer(farmer)}><MessageCircle size={15} /> {text.message}</button><a className="phone-button" href={whatsappLink(farmer.phone, 'Hello, I would like to discuss your available produce.')} target="_blank" rel="noreferrer" title={`WhatsApp ${farmer.farmer}`}><MessageCircle size={15} /></a><a className="phone-button" href={`tel:${farmer.phone}`} title={`${text.call} ${farmer.farmer}`}><Phone size={15} /></a></div></article>)}</div><aside className="compose-panel"><div className="panel-kicker">{text.conversation}</div><h2>{selectedFarmer ? `${text.message} ${selectedFarmer.farmer}` : text.start}</h2>{selectedFarmer ? <><div className="compose-recipient"><div className={`farmer-avatar small ${selectedFarmer.color}`}><Sprout size={18} /></div><div><strong>{selectedFarmer.farm}</strong><span>{selectedFarmer.produce.map((item) => item.name).join(', ')} · {selectedFarmer.farmType} farm</span></div></div><form onSubmit={sendMessage}><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={text.ask} rows="5" /><button className="primary-button full-button" type="submit" disabled={!message.trim()}><MessageCircle size={16} /> {text.send} on WhatsApp</button></form>{sentFarmer === selectedFarmer.farmer && <p className="sent-confirmation"><Check size={15} /> {text.sent} {selectedFarmer.farmer}</p>}</> : <div className="compose-empty"><MessageCircle size={32} /><p>{text.select}</p></div>}</aside></div>
  </section>;
}

function DemandRadar() {
  const { t } = useLanguage();
  const [cropQuery, setCropQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [farmArea, setFarmArea] = useState('Hyderabad');
  const [weather, setWeather] = useState('Sunny');
  const [waterMethod, setWaterMethod] = useState('Drip irrigation');
  const [soilMoisture, setSoilMoisture] = useState('Medium');
  const [temperature, setTemperature] = useState('Warm');
  const [cultivationMethod, setCultivationMethod] = useState('Natural');
  const [orderType, setOrderType] = useState('Household');
  const [supportTopic, setSupportTopic] = useState('rain damage');
  const [supportSent, setSupportSent] = useState(false);
  const areaProfiles = {
    Hyderabad: { soil: 'Red loam', note: 'Watch moisture loss in exposed fields.' },
    Warangal: { soil: 'Red sandy loam', note: 'Protect topsoil after heavy rain.' },
    Nizamabad: { soil: 'Black cotton soil', note: 'Allow the soil surface to dry between watering.' },
    Karimnagar: { soil: 'Alluvial loam', note: 'Use drainage channels during wet spells.' }
  };
  const cities = [
    { name: 'Delhi NCR', state: 'Delhi', crop: 'Tomato demand', produce: ['tomato', 'potato', 'apple'], change: '+21%', level: 'high', position: { top: '18%', left: '49%' } },
    { name: 'Mumbai', state: 'Maharashtra', crop: 'Onion demand', produce: ['onion', 'mango', 'honey'], change: '+18%', level: 'high', position: { top: '63%', left: '28%' } },
    { name: 'Bengaluru', state: 'Karnataka', crop: 'Tur dal demand', produce: ['tur dal', 'dal', 'milk'], change: '+12%', level: 'medium', position: { top: '75%', left: '50%' } },
    { name: 'Kolkata', state: 'West Bengal', crop: 'Chilli demand', produce: ['chilli', 'wheat', 'grain'], change: '+9%', level: 'medium', position: { top: '39%', left: '80%' } },
    { name: 'Hyderabad', state: 'Telangana', crop: 'Cotton demand', produce: ['cotton', 'chilli', 'tur dal'], change: '+16%', level: 'high', position: { top: '61%', left: '48%' } },
    { name: 'Chennai', state: 'Tamil Nadu', crop: 'Coconut demand', produce: ['coconut', 'rice', 'banana'], change: '+14%', level: 'medium', position: { top: '82%', left: '60%' } },
    { name: 'Jaipur', state: 'Rajasthan', crop: 'Mustard demand', produce: ['mustard', 'wheat', 'bajra'], change: '+11%', level: 'medium', position: { top: '32%', left: '35%' } },
    { name: 'Lucknow', state: 'Uttar Pradesh', crop: 'Potato demand', produce: ['potato', 'sugarcane', 'wheat'], change: '+13%', level: 'high', position: { top: '30%', left: '56%' } },
    { name: 'Bhopal', state: 'Madhya Pradesh', crop: 'Soybean demand', produce: ['soybean', 'wheat', 'gram'], change: '+10%', level: 'medium', position: { top: '49%', left: '43%' } },
    { name: 'Kochi', state: 'Kerala', crop: 'Spice demand', produce: ['pepper', 'cardamom', 'coconut'], change: '+8%', level: 'low', position: { top: '88%', left: '43%' } }
  ];
  const normalizedQuery = searchedQuery.trim().toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter((term) => term.length > 2).map((term) => term.replace(/s$/, ''));
  const matchesCity = (city) => !normalizedQuery || [...city.produce, city.name, city.state, city.crop].some((item) => queryTerms.some((term) => item.toLowerCase().includes(term) || term.includes(item.toLowerCase())));
  const matchingCity = cities.find(matchesCity) || cities[0];
  const hasMatch = !normalizedQuery || Boolean(cities.find(matchesCity));
  const searchedProduce = normalizedQuery || matchingCity.produce;
  const selectedArea = areaProfiles[farmArea];
  const rainProfiles = {
    Hyderabad: { probability: 68, amount: '12-18 mm', window: '4 PM - 8 PM', risk: 'Moderate' },
    Warangal: { probability: 76, amount: '18-24 mm', window: '3 PM - 7 PM', risk: 'High' },
    Nizamabad: { probability: 54, amount: '8-14 mm', window: '5 PM - 9 PM', risk: 'Watch' },
    Karimnagar: { probability: 61, amount: '10-16 mm', window: '4 PM - 8 PM', risk: 'Moderate' }
  };
  const rainProfile = rainProfiles[farmArea];
  const rainProbability = weather === 'Rainy' ? Math.max(rainProfile.probability, 82) : weather === 'Heatwave' ? Math.max(8, rainProfile.probability - 35) : weather === 'Cloudy' ? Math.min(84, rainProfile.probability + 8) : rainProfile.probability;
  const harvestAdvice = weather === 'Rainy' ? 'Harvest in the next dry morning and keep produce off wet soil.' : weather === 'Heatwave' ? 'Harvest at dawn, then move the crop into shade within 30 minutes.' : weather === 'Cloudy' ? 'Harvest when leaves are dry and leave extra airflow around packed produce.' : 'Harvest early morning or after sunset to protect freshness.';
  const waterAdvice = waterMethod === 'Drip irrigation' ? 'Run short, frequent cycles and check moisture 5 cm below the surface.' : waterMethod === 'Sprinkler' ? 'Water before 9 AM and avoid wetting leaves overnight.' : waterMethod === 'Flood irrigation' ? 'Reduce standing water and switch to smaller measured furrows where possible.' : 'Use stored rainwater for the next cycle and keep a reserve for dry days.';
  const stateDemand = [
    { name: 'Telangana', region: 'South-Central', demand: orderType === 'Supermarket' ? 31 : orderType === 'Caterer' ? 27 : 24, crop: 'Tomato, chilli, cotton' },
    { name: 'Maharashtra', region: 'West', demand: orderType === 'Retailer' ? 29 : 22, crop: 'Onion, mango, vegetables' },
    { name: 'Karnataka', region: 'South', demand: orderType === 'Household' ? 23 : 19, crop: 'Tur dal, tomato, milk' },
    { name: 'Delhi NCR', region: 'North', demand: orderType === 'Supermarket' ? 25 : 17, crop: 'Tomato, potato, apple' },
    { name: 'Tamil Nadu', region: 'South', demand: orderType === 'Caterer' ? 21 : 15, crop: 'Coconut, rice, banana' }
  ].sort((first, second) => second.demand - first.demand);
  const regionDemand = stateDemand.reduce((groups, item) => { groups[item.region] = (groups[item.region] || 0) + item.demand; return groups; }, {});
  const cropRecommendation = soilMoisture === 'Low' || temperature === 'Hot' ? { crop: 'Millet or chilli', reason: 'Handles lower moisture and warmer conditions.', method: waterMethod === 'Drip irrigation' ? 'Keep drip cycles short and frequent.' : 'Prefer drip irrigation to reduce water loss.' } : selectedArea.soil === 'Black cotton soil' ? { crop: 'Cotton or tur dal', reason: 'Suits moisture-holding soil with a dry gap between watering.', method: 'Use raised beds or drainage channels before heavy rain.' } : rainProbability >= 70 ? { crop: 'Tomato or leafy vegetables', reason: 'Strong demand, but protect the crop from excess rain.', method: 'Use protected cultivation and avoid standing water.' } : { crop: 'Tomato or turmeric', reason: 'Balanced demand with a good fit for current field conditions.', method: 'Natural cultivation with mulch can retain moisture.' };
  return <section className="radar-page page-enter">
    <div className="radar-heading"><div><div className="eyebrow"><span></span> {t('radarKicker')}</div><h1>{t('demandRadar')}</h1><p>{t('demandIntro')}</p></div><div className="radar-status"><span></span> {t('liveSignals')} <small>Updated 12 min ago</small></div></div>
    <form className="radar-search" onSubmit={(event) => { event.preventDefault(); setSearchedQuery(cropQuery); }}><Search size={18} /><input value={cropQuery} onChange={(event) => setCropQuery(event.target.value)} placeholder="Search crops or states, e.g. Telangana cotton" /><button className="ai-search-button" type="submit"><Radar size={13} /> {t('aiSearch')}</button></form>
    <div className="radar-layout">
      <div className="radar-map-panel">
        <div className="radar-panel-top"><div><span className="panel-kicker">INDIA NETWORK</span><h2>{t('demandAcross')}</h2></div><div className="radar-legend"><span><i className="low"></i> {t('low')}</span><span><i className="medium"></i> {t('medium')}</span><span><i className="high"></i> {t('high')}</span></div></div>
        <div className="radar-map india-map" aria-label="India demand map showing Delhi NCR, Mumbai, Bengaluru, and Kolkata">
          <div className="map-grid"></div><div className="state-shape india-shape"><span></span></div><div className="state-label">INDIA</div>
          {cities.map((city) => <div className={`map-pin ${city.level}`} key={city.name} style={city.position}><span></span><b>{city.name}</b></div>)}
          <div className="map-callout"><span>{hasMatch ? 'DEMAND SIGNAL' : 'NO SIGNAL YET'}</span><strong>{hasMatch ? searchedProduce : cropQuery}</strong><b>{hasMatch ? `${matchingCity.change} in ${matchingCity.name}` : 'Try tomato, onion, tur dal, or chilli'}</b><ArrowRight size={15} /></div>
        </div>
      <aside className="radar-insights"><div className="insight-header"><div><span className="panel-kicker">{t('aiReadout')}</span><h2>{t('growNext')}</h2></div><Radar size={20} /></div><div className={`radar-callout ${hasMatch ? '' : 'no-signal'}`}><div className="signal-icon"><TrendingDown size={18} /></div><div><strong>{hasMatch ? `Move ${searchedProduce} toward ${matchingCity.name}` : t('noSignal')}</strong><p>{hasMatch ? `${matchingCity.state} demand is outpacing nearby supply this week.` : t('tryTracked')}</p></div><b>{hasMatch ? matchingCity.change : '?'}</b></div><div className="city-list">{cities.map((city) => <div className={`city-row ${city.name === matchingCity.name && hasMatch ? 'selected' : ''}`} key={city.name}><span className={`city-dot ${city.level}`}></span><div><strong>{city.name}</strong><small>{city.state} · {city.crop}</small></div><b>{city.change}</b><ArrowRight size={14} /></div>)}</div><div className="radar-footer"><MapPin size={15} /> {cities.length} state markets tracked <span>•</span> {cities.length * 7} signals analyzed</div></aside>
    </div>
    </div>
    <section className="radar-analytics">
      <div className="analytics-heading"><div><span className="panel-kicker">DEMAND BREAKDOWN</span><h2>Where demand is strongest</h2><p>Percentages are an indicative mix of observed inventory and order signals.</p></div><label className="order-type-picker"><span>Order type</span><select value={orderType} onChange={(event) => setOrderType(event.target.value)}><option>Household</option><option>Caterer</option><option>Supermarket</option><option>Retailer</option></select></label></div>
      <div className="analytics-grid"><div className="demand-breakdown"><div className="analytics-subheading"><h3>Demand by state</h3><span>{orderType} orders</span></div>{stateDemand.map((item) => <div className="demand-bar-row" key={item.name}><div><strong>{item.name}</strong><small>{item.crop}</small></div><div className="demand-bar"><span style={{ width: `${item.demand * 2.5}%` }}></span></div><b>{item.demand}%</b></div>)}</div><div className="region-breakdown"><div className="analytics-subheading"><h3>Demand by region</h3><span>Share of signals</span></div>{Object.entries(regionDemand).map(([region, demand]) => <div className="region-row" key={region}><div><strong>{region}</strong><small>{demand >= 45 ? 'High opportunity' : 'Growing opportunity'}</small></div><b>{demand}%</b></div>)}<div className="demand-legend"><span><i></i> Order mix changes with buyer type</span><span><i></i> Use as a planning signal, not a guaranteed price</span></div></div></div>
      <div className="crop-planner"><div className="analytics-heading"><div><span className="panel-kicker">FIELD-TO-CROP GUIDE</span><h2>What should you produce?</h2></div><Sprout size={22} /></div><div className="crop-planner-controls"><label><span>Soil moisture</span><select value={soilMoisture} onChange={(event) => setSoilMoisture(event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label><label><span>Temperature</span><select value={temperature} onChange={(event) => setTemperature(event.target.value)}><option>Cool</option><option>Warm</option><option>Hot</option></select></label><label><span>Irrigation method</span><select value={waterMethod} onChange={(event) => setWaterMethod(event.target.value)}><option>Drip irrigation</option><option>Sprinkler</option><option>Flood irrigation</option><option>Rainfed</option></select></label><label><span>Cultivation method</span><select value={cultivationMethod} onChange={(event) => setCultivationMethod(event.target.value)}><option>Natural</option><option>Organic</option><option>Conventional</option><option>Protected cultivation</option></select></label></div><div className="crop-recommendation"><div><small>RECOMMENDED CROP</small><strong>{cropRecommendation.crop}</strong><p>{cropRecommendation.reason}</p></div><div><small>RAIN RATING</small><strong>{rainProbability}% <em>{rainProfile.risk}</em></strong><p>{rainProfile.amount} expected · {rainProfile.window}</p></div><div><small>FIELD ACTION</small><strong>{cultivationMethod}</strong><p>{cropRecommendation.method}</p></div></div></div>
    </section>
    <div className="radar-tools">
      <article className="rain-predictor">
        <div className="tool-card-heading"><div><span className="panel-kicker">FIELD WEATHER</span><h2>Rain predictor</h2></div><CloudRain size={22} /></div>
        <div className="rain-controls">
          <label><span>Farm area</span><select value={farmArea} onChange={(event) => setFarmArea(event.target.value)}>{Object.keys(areaProfiles).map((area) => <option key={area}>{area}</option>)}</select></label>
          <label><span>Today feels</span><select value={weather} onChange={(event) => setWeather(event.target.value)}><option>Sunny</option><option>Cloudy</option><option>Rainy</option><option>Heatwave</option></select></label>
        </div>
        <div className="rain-score"><div><small>RAIN CHANCE TODAY</small><strong>{rainProbability}%</strong></div><div className="rain-meter"><span style={{ width: `${rainProbability}%` }}></span></div><b>{rainProfile.risk} risk</b></div>
        <div className="rain-details"><span><b>Expected</b>{rainProfile.amount}</span><span><b>Likely window</b>{rainProfile.window}</span><span><b>Soil</b>{selectedArea.soil}</span></div>
        <p className="tool-advice"><strong>Plan:</strong> {harvestAdvice} {waterAdvice}</p>
      </article>
      <article className="support-panel">
        <div className="tool-card-heading"><div><span className="panel-kicker">FARMER CARE DESK</span><h2>Need a hand?</h2></div><MessageCircle size={22} /></div>
        <p>Talk to a real FarmDirect support partner about weather damage, orders, or delivery.</p>
        <label className="support-topic"><span>What can we help with?</span><select value={supportTopic} onChange={(event) => { setSupportTopic(event.target.value); setSupportSent(false); }}><option value="rain damage">Rain damage</option><option value="an order">An order</option><option value="selling produce">Selling produce</option></select></label>
        <div className="support-actions"><a className="whatsapp-cta" href={whatsappLink(WHATSAPP_HELP_LINE, `Hello, I need help with ${supportTopic}. I am farming in ${farmArea}.`)} target="_blank" rel="noreferrer" aria-label="Message farmer support on WhatsApp"><MessageCircle size={15} /> WhatsApp</a><a className="support-icon-link" href={`tel:${WHATSAPP_HELP_LINE}`} title="Call farmer support" aria-label="Call farmer support"><Phone size={16} /></a><a className="support-icon-link" href="mailto:support@farmersatoz.in?subject=FarmDirect%20support" title="Email farmer support" aria-label="Email farmer support"><Mail size={16} /></a></div>
        <button className="support-confirm" type="button" onClick={() => setSupportSent(true)}>{supportSent ? 'Support request noted' : 'I need a callback'}</button>
      </article>
    </div>
  </section>;
}

function Calculator() { const [quantity, setQuantity] = useState(12); const farmPrice = 22 * quantity; const marketPrice = 45 * quantity; const saved = marketPrice - farmPrice; return <section className="tool-page page-enter"><div className="tool-intro"><div className="eyebrow"><span></span> SEE THE DIFFERENCE</div><h1>What does the middleman<br /><em>really cost you?</em></h1><p>Move the dial. Watch the extra layers disappear from your basket and your bill.</p></div><div className="calculator-layout"><div className="calculator-panel"><div className="panel-top"><span>CALCULATE YOUR SAVINGS</span><TrendingDown size={18} /></div><div className="quantity-display"><small>BUYING</small><strong>{quantity}<i> kg</i></strong><span>of vine tomatoes</span></div><input className="range" type="range" min="1" max="100" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /><div className="range-labels"><span>1 kg</span><span>100 kg</span></div><div className="price-compare"><div><span>Typical retail price</span><strong className="struck">{money(marketPrice)}</strong><small>includes 51% of middleman layers</small></div><div className="arrow-separator"><ArrowRight size={18} /></div><div className="fair-price"><span>Farmers A to Z price</span><strong>{money(farmPrice)}</strong><small>paid straight to the farm</small></div></div><div className="saved-total"><div><Zap size={18} /><span>You keep</span></div><strong>{money(saved)}</strong><small>in your pocket</small></div></div><div className="flow-panel"><div className="eyebrow muted">WHERE YOUR MONEY GOES</div><h2>One clean connection.</h2><p>With Farmers A to Z, your money travels a shorter, clearer distance.</p><div className="money-flow"><div className="flow-node farmer-node"><div><Sprout size={24} /></div><span>Farmer</span><strong>{money(farmPrice)}</strong></div><div className="flow-line direct"><span>100% of farm price</span></div><div className="flow-node buyer-node"><div><ShoppingBasket size={24} /></div><span>Your basket</span><strong>{money(farmPrice)}</strong></div><div className="flow-line middle"><span>retail route</span></div><div className="flow-node market-node"><div><Store size={24} /></div><span>Middlemen</span><strong>{money(saved)}</strong></div></div></div></div></section>; }

function Orders({ orders, onUpdateOrder }) { const total = orders.reduce((sum, order) => sum + order.total, 0); const saved = orders.reduce((sum, order) => sum + order.savings, 0); return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> YOUR FARM CONNECTIONS</div><h1>Orders & <em>savings</em></h1><p>Every order is a direct line to the people who grow your food.</p></div><div className="stat-cluster"><div><small>TOTAL SPENT</small><strong>{money(total)}</strong></div><div><small>YOU'VE SAVED</small><strong className="green-text">{money(saved)}</strong></div></div></div>{orders.length === 0 ? <div className="empty-orders"><PackageCheck size={44} /><h2>Your basket is waiting</h2><p>Orders you place from the marketplace will appear here.</p></div> : <div className="orders-list">{orders.map((order) => <article className="order-row" key={order.id}>{order.photo ? <img className="order-item-image" src={order.photo} alt={order.name} /> : <div className="order-icon"><Truck size={21} /></div>}<div className="order-main"><div><h3>{order.name}</h3><p>{order.farm} · {order.date}</p><div className="order-details"><span><b>Buying for:</b> {order.buyerType || 'Household'}</span><span><b>Quantity:</b> {order.quantity} {order.unit}</span><span><b>Buyer:</b> {order.buyer || 'Not provided'}</span><span><b>Farmer:</b> {order.farmer || 'FarmDirect Network'}</span><span><b>Deliver to:</b> {order.address || 'Address pending'}</span><span><b>Delivery:</b> {order.deliveryWindow || 'Flexible timing'}</span><span><b>Farmer receives:</b> {money(order.productTotal || Math.max(0, order.total - (order.deliveryCharge || 0)))}</span><span><b>Delivery partner earns:</b> {money(order.deliveryCharge || 0)}</span></div><small className="payment-label">Payment: {order.paymentMethod || 'Cash on Delivery'}</small><QualityVerification order={order} role="buyer" onUpdate={onUpdateOrder} /></div><span className="status"><span></span>{order.status}</span></div><div className="order-amount"><strong>{money(order.total)}</strong><span>Saved {money(order.savings)}</span></div><ChevronDown size={18} /></article>)}</div>}</section>; }

function FarmerHubWithVoice({ produce, orders, onAdd, onDelete, onUpdateOrder }) { const revenue = orders.reduce((sum, order) => sum + order.total, 0); return <section className="content-page page-enter"><div className="page-header farmer-header"><div><div className="eyebrow"><span></span> YOUR FARM, YOUR TERMS</div><h1>Farmer <em>hub</em></h1><p>Manage your harvest, reach buyers, and source what your farm needs.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add a listing</button></div><div className="dashboard-stats"><div><Sprout size={19} /><small>ACTIVE LISTINGS</small><strong>{produce.length}</strong></div><div><CircleDollarSign size={19} /><small>DIRECT REVENUE</small><strong>{money(revenue)}</strong></div><div><PackageCheck size={19} /><small>ORDERS RECEIVED</small><strong>{orders.length}</strong></div><div><BarChart3 size={19} /><small>YOUR REACH</small><strong>{new Set(orders.map((order) => order.buyer)).size || 0} buyers</strong></div></div><SellNowOrWait produce={produce} /><UnsoldProduceRescue produce={produce} /><div className="hub-grid"><div className="hub-panel"><div className="panel-heading"><div><div className="eyebrow muted">YOUR HARVEST</div><h2>Active listings</h2></div><span>{produce.length} crops</span></div>{produce.map((item) => <div className="listing-row" key={item.id}><div className={`mini-produce ${item.color}`}></div><div><strong>{item.name}</strong><span>{item.quantity} {item.unit} available · {money(item.farmPrice)}/{item.unit}</span></div><button className="icon-button" title="Delete listing" onClick={() => onDelete(item.id)}><X size={16} /></button></div>)}</div><div className="hub-panel incoming"><div className="panel-heading"><div><div className="eyebrow muted">INCOMING</div><h2>Recent orders</h2></div></div>{orders.length === 0 ? <div className="mini-empty"><Clock3 size={20} /> No orders yet</div> : orders.slice(0, 4).map((order) => <div className="incoming-row" key={order.id}><div><strong>{order.name}</strong><span>{order.quantity} {order.unit} · {order.buyer}</span><QualityVerification order={order} role="farmer" onUpdate={onUpdateOrder} /></div><b>{money(order.total)}</b></div>)}</div></div></section>; }

function SellNowOrWait({ produce }) {
  const [selectedId, setSelectedId] = useState(produce[0]?.id || '');
  const [quantity, setQuantity] = useState(Math.min(50, Number(produce[0]?.quantity) || 1));
  const [currentPrice, setCurrentPrice] = useState(Number(produce[0]?.farmPrice) || 0);
  const [expectedPrice, setExpectedPrice] = useState(Number(produce[0]?.middlemanPrice) || Number(produce[0]?.farmPrice) || 0);
  const [storageCost, setStorageCost] = useState(2);
  const [waitDays, setWaitDays] = useState(3);
  const [spoilageRisk, setSpoilageRisk] = useState(10);
  const selected = produce.find((item) => String(item.id) === String(selectedId)) || produce[0];
  const sellNow = Math.max(0, quantity) * Math.max(0, currentPrice);
  const waitRevenue = Math.max(0, quantity) * Math.max(0, expectedPrice) * (1 - Math.min(100, Math.max(0, spoilageRisk)) / 100);
  const waitCost = Math.max(0, quantity) * Math.max(0, storageCost) * Math.max(0, waitDays);
  const waitNet = waitRevenue - waitCost;
  const advantage = waitNet - sellNow;
  const updateCrop = (event) => { const item = produce.find((entry) => String(entry.id) === event.target.value); if (!item) return; setSelectedId(item.id); setQuantity(Math.min(50, Number(item.quantity) || 1)); setCurrentPrice(Number(item.farmPrice) || 0); setExpectedPrice(Number(item.middlemanPrice) || Number(item.farmPrice) || 0); };
  return <section className="sell-simulator"><div className="simulator-heading"><div><div className="eyebrow muted"><Clock3 size={13} /> PLAN YOUR SALE</div><h2>Sell now or wait?</h2><p>See what storage cost and spoilage risk could do to your take-home amount.</p></div><div className={`simulator-verdict ${advantage > 0 ? 'wait' : 'now'}`}><strong>{advantage > 0 ? 'Wait looks stronger' : 'Selling now looks stronger'}</strong><span>{advantage >= 0 ? '+' : '-'}{money(Math.abs(advantage))} vs the other option</span></div></div><div className="simulator-controls"><label className="field"><span>Crop</span><select value={selected?.id || ''} onChange={updateCrop}>{produce.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Quantity ({selected?.unit || 'units'})</span><input type="number" min="1" max={selected?.quantity || 1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(Number(selected?.quantity) || 1, Number(event.target.value) || 1)))} /></label><label className="field"><span>Current price / {selected?.unit || 'unit'}</span><input type="number" min="0" value={currentPrice} onChange={(event) => setCurrentPrice(Number(event.target.value) || 0)} /></label><label className="field"><span>Expected price after waiting</span><input type="number" min="0" value={expectedPrice} onChange={(event) => setExpectedPrice(Number(event.target.value) || 0)} /></label><label className="field"><span>Storage cost / unit / day</span><input type="number" min="0" value={storageCost} onChange={(event) => setStorageCost(Number(event.target.value) || 0)} /></label><label className="field"><span>Wait days</span><input type="number" min="0" max="60" value={waitDays} onChange={(event) => setWaitDays(Math.max(0, Math.min(60, Number(event.target.value) || 0)))} /></label><label className="field"><span>Spoilage risk</span><div className="simulator-range"><input type="range" min="0" max="80" value={spoilageRisk} onChange={(event) => setSpoilageRisk(Number(event.target.value))} /><b>{spoilageRisk}%</b></div></label></div><div className="simulator-results"><div><span>Sell now</span><strong>{money(sellNow)}</strong><small>Guaranteed before storage</small></div><div className="simulator-arrow"><ArrowRight size={18} /></div><div className="wait-result"><span>Wait {waitDays} days</span><strong>{money(waitNet)}</strong><small>{money(waitRevenue)} after spoilage − {money(waitCost)} storage</small></div></div></section>;
}

function UnsoldProduceRescue({ produce }) {
  const [selectedId, setSelectedId] = useState(produce[0]?.id || '');
  const [quantity, setQuantity] = useState(Number(produce[0]?.quantity) || 1);
  const [location, setLocation] = useState(produce[0]?.location || '');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const selected = produce.find((item) => String(item.id) === String(selectedId)) || produce[0] || {};
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(`${harvestDate}T00:00:00`).getTime()) / 86400000));
  const locationText = location.toLowerCase();
  const buyerProfiles = [
    { name: 'Local caterers and hotels', detail: 'Quick pickup for kitchens, events, and daily menus', icon: Store, areas: ['pune', 'anand', 'hyderabad', 'karnal'], categories: ['Vegetables', 'Fruits', 'Flowers'], phone: '+919876543210' },
    { name: 'Nearby retailers', detail: 'Small, repeat orders for neighbourhood customers', icon: ShoppingBasket, areas: ['jalandhar', 'pune', 'karnal', 'hyderabad'], categories: ['Vegetables', 'Fruits', 'Dairy'], phone: '+919812345678' },
    { name: 'Processors and community kitchens', detail: 'Good outlet for bulk or slightly older harvests', icon: PackageCheck, areas: ['ratnagiri', 'gulbarga', 'sehore', 'hoshangabad'], categories: ['Fruits', 'Pulses', 'Grains', 'Vegetables'], phone: '+919812345678' }
  ];
  const buyers = buyerProfiles.map((buyer, index) => ({ ...buyer, score: (buyer.areas.some((area) => locationText.includes(area)) ? 2 : 0) + (buyer.categories.includes(selected.category) ? 1 : 0) + (ageDays > 2 && index === 2 ? 1 : 0) })).sort((first, second) => second.score - first.score);
  const uses = {
    Vegetables: ['Sell as soup, pickle, chutney, or ready-to-cook packs', 'Donate to a community kitchen before quality drops'],
    Fruits: ['Offer juice, jam, pulp, or cut-fruit processors', 'Bundle ripe fruit for local stalls at a quick-sale price'],
    Grains: ['Route to a local mill, flour maker, or cattle feed buyer', 'Create smaller household packs with a longer shelf life'],
    Pulses: ['Connect with a dal mill or women’s self-help group', 'Clean and pack into smaller retail quantities'],
    Flowers: ['Approach temples, decorators, hotels, and event planners', 'Convert older flowers into natural colour, compost, or incense'],
    Dairy: ['Call a sweet maker, tea shop, or nearby bulk buyer', 'Turn surplus into curd, paneer, or ghee where safe']
  }[selected.category] || ['Offer a bulk discount to nearby retailers or caterers', 'Convert the harvest into a shelf-stable product or compost'];
  const updateCrop = (event) => { const item = produce.find((entry) => String(entry.id) === event.target.value); if (!item) return; setSelectedId(item.id); setQuantity(Number(item.quantity) || 1); setLocation(item.location || ''); };
  const contactBuyer = (buyer) => window.open(whatsappLink(buyer.phone, `Hello, I have ${quantity} ${selected.unit || 'units'} of ${selected.name} harvested on ${harvestDate} near ${location}. Are you interested in a quick pickup?`), '_blank', 'noopener,noreferrer');
  return <section className="rescue-tool"><div className="rescue-heading"><div><div className="eyebrow muted"><AlertTriangle size={13} /> SAVE THIS HARVEST</div><h2>Unsold produce rescue</h2><p>Tell us what is left and we will surface practical nearby outlets before it loses value.</p></div><div className={`rescue-age ${ageDays > 3 ? 'urgent' : ''}`}><strong>{ageDays === 0 ? 'Harvested today' : `${ageDays} day${ageDays === 1 ? '' : 's'} old`}</strong><span>{ageDays > 3 ? 'Act quickly' : 'Still time to find a buyer'}</span></div></div><div className="rescue-form"><label className="field"><span>Produce</span><select value={selected.id || ''} onChange={updateCrop}>{produce.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Unsold quantity ({selected.unit || 'units'})</span><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} /></label><label className="field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Village, district, or city" /></label><label className="field"><span>Harvest date</span><input type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} /></label></div><div className="rescue-grid"><div className="rescue-buyers"><div className="rescue-section-heading"><div><span className="panel-kicker">POSSIBLE BUYERS</span><h3>Nearby outlets to try</h3></div><span>{buyers.length} matches</span></div>{buyers.map((buyer) => { const Icon = buyer.icon; return <article className="rescue-buyer" key={buyer.name}><div className="rescue-buyer-icon"><Icon size={17} /></div><div><strong>{buyer.name}</strong><span>{buyer.detail}</span><small>{buyer.score >= 3 ? 'Strong match' : buyer.score >= 2 ? 'Good match' : 'Worth trying'} · {location || 'your area'}</small></div><button type="button" className="rescue-contact" onClick={() => contactBuyer(buyer)} title={`Contact ${buyer.name}`}><MessageCircle size={14} /> WhatsApp</button></article>; })}</div><aside className="rescue-uses"><span className="panel-kicker">ALTERNATIVE USES</span><h3>Protect some value</h3>{uses.map((use) => <div key={use}><Leaf size={15} /><span>{use}</span></div>)}<p><ShieldCheck size={14} /> Check food safety and local rules before processing or donating.</p></aside></div></section>;
}

function VoiceNavigationAssistant({ language, onNavigate, onAddListing }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('Tap the microphone and ask to open any page.');
  const recognitionRef = useRef(null);
  const languageCode = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', ml: 'ml-IN' }[language] || 'en-IN';
  const speak = (value) => { setMessage(value); if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(value); utterance.lang = languageCode; utterance.rate = 0.92; window.speechSynthesis.speak(utterance); } };
  const handleCommand = (transcript) => { const command = transcript.toLowerCase(); if (/(help|मदद|సహాయం|உதவி|ಸಹಾಯ|സഹായം)/i.test(command)) { speak('Say marketplace, orders, reviews, inputs, nearby markets, machinery, demand radar, calculator, retail, farmer hub, or add produce.'); return; } if (/(machin|tractor|harvester|sprayer|యంత్ర|मशीन|ట్రాక్టర్|హార్వెస్టర్|ஆலை|ಯಂತ್ರ|യന്ത്ര)/i.test(command)) { speak('Opening machinery sharing.'); onNavigate('machinery'); return; } if (/(order|ऑर्डर|ఆర్డర్|ஆர்டர்|ಆರ್ಡರ್|ഓർഡർ)/i.test(command)) { speak('Opening your orders.'); onNavigate('orders'); return; } if (/(review|रेटिंग|समीक्षा|సమీక్ష|விமர்சன|ವಿಮರ್ಶೆ|അവലോകന)/i.test(command)) { speak('Opening reviews.'); onNavigate('reviews'); return; } if (/(input|supply|बीज|खाद|सामग्री|ఇన్‌పుట్|விவசாயப் பொருட்கள்|ಕೃಷಿ ಸಾಮಗ್ರಿ|കാർഷിക സാമഗ്രി)/i.test(command)) { speak('Opening farm inputs.'); onNavigate('inputs'); return; } if (/(nearby|market|बाजार|बाज़ार|मंडी|మార్కెట్|சந்தை|ಮಾರುಕಟ್ಟೆ|വിപണി)/i.test(command) && !/(demand|डिमांड|డిమాండ్|தேவை|ಬೇಡಿಕೆ|ഡിമാൻഡ്)/i.test(command)) { speak('Opening nearby markets.'); onNavigate(command.includes('retail') ? 'retail-connect' : command.includes('marketplace') ? 'market' : 'nearby-markets'); return; } if (/(retail|खुदरा|రిటైల్|சில்லறை|ಚಿಲ್ಲರೆ|റീട്ടെയിൽ)/i.test(command)) { speak('Opening retail connect.'); onNavigate('retail-connect'); return; } if (/(calculator|बचत|कैलकुलेटर|లెక్క|கணக்கீடு|ಕ್ಯಾಲ್ಕುಲೇಟರ್|കാൽക്കുലേറ്റർ)/i.test(command)) { speak('Opening the savings calculator.'); onNavigate('calculator'); return; } if (/(radar|demand|मांग|डिमांड|డిమాండ్|தேவை|ಬೇಡಿಕೆ|ഡിമാൻഡ്)/i.test(command)) { speak('Opening demand radar.'); onNavigate('radar'); return; } if (/(add|list|produce|crop|फसल|जोड़|पంట|జోడ|பயிர்|ಬೆಳೆ|വിള)/i.test(command)) { speak('Opening the produce listing form.'); onAddListing(); return; } if (/(farmer|किसान|రైతు|விவசாயி|ರೈತ|കർഷക)/i.test(command)) { speak('Opening the farmer hub.'); onNavigate('farmer'); return; } if (/(home|marketplace|shop|खरीद|बाज़ार|बाजार|మార్కెట్|சந்தை|ಮಾರುಕಟ್ಟೆ|വിപണി)/i.test(command)) { speak('Opening the marketplace.'); onNavigate('market'); return; } speak('I did not understand. Say help for available pages.'); };
  const listen = () => { const Recognition = speechRecognition(); if (!Recognition) { speak('Voice input is not supported in this browser.'); return; } if (listening) { recognitionRef.current?.abort(); return; } const recognition = new Recognition(); recognition.lang = languageCode; recognition.interimResults = false; recognition.continuous = false; recognition.maxAlternatives = 1; recognition.onstart = () => { setListening(true); setMessage('Listening...'); }; recognition.onresult = (event) => handleCommand(event.results?.[0]?.[0]?.transcript?.trim() || ''); recognition.onerror = () => speak('I could not hear that. Please try again.'); recognition.onend = () => setListening(false); recognitionRef.current = recognition; try { recognition.start(); } catch { setListening(false); } };
  useEffect(() => () => { recognitionRef.current?.abort(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  return <div className={`farmer-voice-assistant ${listening ? 'listening' : ''}`}><div className="farmer-voice-icon"><Mic size={22} /></div><div><span className="panel-kicker">VOICE PAGE NAVIGATOR</span><h2>Speak in your language</h2><p>{message}</p></div><button type="button" className="voice-assistant-button" onClick={listen} aria-label={listening ? 'Stop voice assistant' : 'Start voice assistant'}>{listening ? <MicOff size={18} /> : <Mic size={18} />}<span>{listening ? 'Listening' : 'Speak'}</span></button></div>;
}

function PaymentScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stream;
    let frame;
    let active = true;
    const start = async () => {
      if (!('BarcodeDetector' in window)) { setError('QR scanning is not supported in this browser. Use the payment app button instead.'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const scan = async () => {
          if (!active) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue || '';
            if (/^(upi|phonepe|tez):\/\//i.test(value)) { onScan(value); return; }
          } catch { setError('Keep the payment QR code inside the camera frame.'); }
          frame = requestAnimationFrame(scan);
        };
        scan();
      } catch { setError('Camera access is required to scan a payment QR code.'); }
    };
    start();
    return () => { active = false; if (frame) cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); };
  }, [onScan]);
  return <div className="scanner-backdrop"><div className="payment-scanner"><div className="scanner-heading"><div><span className="panel-kicker">PAYMENT SCANNER</span><h2>Scan a UPI QR code</h2></div><button className="close-button" onClick={onClose} aria-label="Close scanner"><X size={18} /></button></div><video ref={videoRef} className="scanner-video" muted playsInline /><div className="scanner-frame"></div><p>{error || 'Point your camera at the PhonePe or Google Pay QR code.'}</p><button className="secondary-button" onClick={onClose}>Cancel</button></div></div>;
}

function UpiQrModal({ method, amount, onClose, onOpenApp, onScan }) {
  const [qrSource, setQrSource] = useState('');
  useEffect(() => {
    const payload = `upi://pay?pa=${UPI_ID}&pn=Farmers%20A%20to%20Z&am=${amount.toFixed(2)}&cu=INR`;
    QRCode.toDataURL(payload, { width: 280, margin: 2, color: { dark: '#123f3b', light: '#fffdf7' } }).then(setQrSource).catch(() => setQrSource(''));
  }, [amount]);
  return <div className="upi-modal-backdrop"><div className="upi-modal"><button className="close-button" onClick={onClose} aria-label="Close payment QR"><X size={18} /></button><div className="upi-modal-kicker">{method.toUpperCase()} PAYMENT</div><h2>Scan to pay securely</h2><p className="upi-amount">{money(amount)}</p><div className="upi-qr-wrap">{qrSource ? <img src={qrSource} alt={`UPI QR code for ${money(amount)}`} /> : <span>Generating QR...</span>}</div><p className="upi-instructions">Open {method} on your phone, scan this QR code, and confirm the payment. The QR is linked to Farmers A to Z.</p><div className="upi-modal-actions"><button className="secondary-button" onClick={onScan}><Camera size={15} /> Scan another QR</button><button className="primary-button" onClick={onOpenApp}>Open {method} <ArrowRight size={15} /></button></div></div></div>;
}

function AgriculturalInputs({ onBuyInput }) { const { language } = useLanguage(); const localizedInputs = farmInputs.map((input, index) => localizeInput(input, index, language)); return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> FARM SUPPLY MARKET</div><h1>Agricultural <em>inputs</em></h1><p>Source practical seeds, soil care, crop protection, irrigation, and farm gear directly for your next growing cycle.</p></div></div><div className="input-shop"><div className="panel-heading"><div><div className="eyebrow muted">GROW WHAT IS NEXT</div><h2>Stock up for less</h2></div><span>{localizedInputs.length} supplies available</span></div><div className="input-grid">{localizedInputs.map((input) => <article className="input-card" key={input.name}><img className="input-photo" src={input.image} alt={input.name} /><div className="input-card-content"><span className="input-type">{input.type}</span><h3>{input.name}</h3><strong>{money(input.price)}</strong><small>{input.discount}</small><button className="buy-input" onClick={() => onBuyInput({ ...input, category: 'Farm input', unit: 'item', quantity: 1, farm: 'FarmDirect Inputs', middlemanPrice: input.price })}>Add to cart <ShoppingBasket size={14} /></button></div></article>)}</div></div></section>; }

function Cart({ items, onCheckout }) { const [cartItems, setCartItems] = useState(() => items.map((item) => ({ ...item, cartQuantity: item.cartQuantity || 1 }))); const [showCheckout, setShowCheckout] = useState(false); const [buyer, setBuyer] = useState(''); const [address, setAddress] = useState(''); const [distanceKm, setDistanceKm] = useState(5); const [deliveryWindow, setDeliveryWindow] = useState('30 minutes'); const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery'); const [buyerType, setBuyerType] = useState(items[0]?.buyerType || 'Household'); const total = cartItems.reduce((sum, item) => sum + (item.price || item.farmPrice || 0) * item.cartQuantity, 0); const deliveryCharge = distanceKm * deliveryChargePerKm; const updateQuantity = (cartId, quantity) => setCartItems((current) => current.map((item) => item.cartId === cartId ? { ...item, cartQuantity: Math.max(1, Math.min(item.quantity || quantity, quantity)) } : item)); const removeItem = (cartId) => setCartItems((current) => current.filter((item) => item.cartId !== cartId)); return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> YOUR SHOPPING BAG</div><h1>Cart & <em>checkout</em></h1><p>Review produce and farm supplies before placing your order.</p></div></div>{cartItems.length === 0 ? <div className="empty-orders"><ShoppingBasket size={44} /><h2>Your cart is empty</h2><p>Add produce or farm inputs to see them here.</p></div> : <div className="cart-list">{cartItems.map((item) => <div className="cart-row" key={item.cartId}><div className="cart-item-details">{(item.photo || produceImages[item.id]) && <img className="cart-item-image" src={item.photo || produceImages[item.id]} alt={item.name} />}<div><strong>{item.name}</strong><span>{item.category} · {item.discount || 'Direct farm price'}</span></div></div><div className="cart-item-actions"><div className="cart-quantity" aria-label={`Quantity for ${item.name}`}><button type="button" aria-label={`Decrease ${item.name} quantity`} disabled={item.cartQuantity <= 1} onClick={() => updateQuantity(item.cartId, item.cartQuantity - 1)}><Minus size={14} /></button><strong>{item.cartQuantity}</strong><button type="button" aria-label={`Increase ${item.name} quantity`} disabled={item.cartQuantity >= (item.quantity || item.cartQuantity)} onClick={() => updateQuantity(item.cartId, item.cartQuantity + 1)}><Plus size={14} /></button></div><b>{money((item.price || item.farmPrice) * item.cartQuantity)}</b><button type="button" className="cart-remove" aria-label={`Remove ${item.name} from cart`} onClick={() => removeItem(item.cartId)}><X size={15} /></button></div></div>)}<div className="cart-total"><span>Total</span><strong>{money(total)}</strong></div>{showCheckout && <div className="cart-checkout-fields"><label className="field"><span>Your name</span><input required value={buyer} onChange={(event) => setBuyer(event.target.value)} placeholder="e.g. Priya Sharma" /></label><label className="field"><span>Delivery address</span><input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Where should we bring it?" /></label><div className="delivery-fields"><label className="field"><span>Distance (km)</span><input type="number" min="1" value={distanceKm} onChange={(event) => setDistanceKm(Math.max(1, Number(event.target.value) || 1))} /></label><label className="field"><span>Delivery timing</span><select value={deliveryWindow} onChange={(event) => setDeliveryWindow(event.target.value)}><option>30 minutes</option><option>Today evening</option><option>Tomorrow morning</option><option>Choose with partner</option></select></label></div><label className="field"><span>Buying for</span><select value={buyerType} onChange={(event) => setBuyerType(event.target.value)}>{buyerTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="field payment-field"><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash on Delivery</option><option>PhonePe</option><option>Google Pay</option></select></label><div className="delivery-breakdown"><span><Route size={14} /> {distanceKm} km x ₹{deliveryChargePerKm}</span><strong>Delivery {money(deliveryCharge)}</strong></div></div>}<button className="primary-button full-button" disabled={showCheckout && (!buyer.trim() || !address.trim())} onClick={() => showCheckout ? onCheckout(cartItems, buyer, address, distanceKm, deliveryWindow, paymentMethod, buyerType) : setShowCheckout(true)}>{showCheckout ? <><Check size={16} /> Place order</> : <><ShoppingBasket size={16} /> Continue to checkout</>}</button></div>}</section>; }

function LegacyOperationsDashboard({ orders }) {
  const partnerName = 'GreenRoute Partner';
  const [available, setAvailable] = useState(() => load('farmdirect-delivery-available', false));
  const terminalStatuses = ['delivered', 'rejected'];
  const availableOrders = orders.filter((order) => !order.partner && !terminalStatuses.includes(order.deliveryStatus) && ['Awaiting assignment', 'awaiting_partner'].includes(order.status || order.deliveryStatus));
  const activeOrders = orders.filter((order) => order.partner === partnerName && !terminalStatuses.includes(order.deliveryStatus));
  const history = orders.filter((order) => order.partner === partnerName && terminalStatuses.includes(order.deliveryStatus));
  const updateOrder = (id, changes) => window.dispatchEvent(new CustomEvent('farmdirect-delivery-update', { detail: { id, changes } }));
  const acceptOrder = (order) => updateOrder(order.id, { partner: partnerName, status: 'Accepted by delivery partner', deliveryStatus: 'accepted', acceptedAt: new Date().toISOString() });
  const rejectOrder = (order) => updateOrder(order.id, { partner: partnerName, status: 'Rejected by delivery partner', deliveryStatus: 'rejected', rejectedAt: new Date().toISOString() });
  const markDelivered = (order) => updateOrder(order.id, { status: 'Delivered', deliveryStatus: 'delivered', deliveredAt: new Date().toISOString() });
  const toggleAvailability = () => { setAvailable((current) => { const next = !current; localStorage.setItem('farmdirect-delivery-available', JSON.stringify(next)); return next; }); };
  return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> DELIVERY CONTROL CENTRE</div><h1>Operations <em>dashboard</em></h1><p>Manage your availability, accept delivery requests, and keep a record of completed runs.</p></div><div className={`availability-toggle ${available ? 'online' : 'offline'}`}><span></span><strong>{available ? 'Available for deliveries' : 'Off duty'}</strong><button onClick={toggleAvailability}>{available ? 'Go offline' : 'Go online'}</button></div></div>{available && availableOrders.length > 0 && <div className="partner-panel delivery-requests"><div className="panel-heading"><div><div className="eyebrow muted">NEW REQUESTS</div><h2>Delivery requests</h2></div><span>{availableOrders.length} waiting</span></div>{availableOrders.map((order) => <DeliveryPartnerOrder key={order.id} order={order} onAccept={() => acceptOrder(order)} onReject={() => rejectOrder(order)} />)}</div>}{!available && <div className="availability-notice"><Clock3 size={20} /><div><strong>You are off duty</strong><span>Go online when you are ready to receive delivery requests.</span></div></div>}<DeliveryRouteMap orders={activeOrders} /><div className="partner-panel"><div className="partner-hero"><Truck size={27} /><div><span className="panel-kicker">TODAY'S ROUTE</span><h2>Deliveries for {partnerName}</h2><p>Accept a request, follow the route, and mark each order delivered.</p></div></div>{activeOrders.map((order) => <DeliveryPartnerOrder key={order.id} order={order} onReject={() => rejectOrder(order)} onDelivered={() => markDelivered(order)} />)}{activeOrders.length === 0 && <div className="mini-empty"><Route size={20} /> No active deliveries yet.</div>}</div><div className="partner-panel delivery-history"><div className="panel-heading"><div><div className="eyebrow muted">DELIVERY HISTORY</div><h2>Previous deliveries</h2></div><span>{history.length} completed</span></div>{history.map((order) => <div className="history-row" key={order.id}><div><strong>{order.name}</strong><span>{order.buyer || 'Buyer'} · {order.address || 'Address pending'}</span></div><b className={order.deliveryStatus}>{order.deliveryStatus === 'delivered' ? 'Delivered' : 'Rejected'}</b></div>)}{history.length === 0 && <div className="mini-empty"><Clock3 size={20} /> Previous deliveries will appear here.</div>}</div></section>;
}

function DeliveryPartnerApplicationForm({ application, onSaved }) {
  const [form, setForm] = useState(application || { full_name: '', mobile_number: '', email: '', operating_location: '', service_area: '', vehicle_type: 'Bike', vehicle_number: '', government_id_type: 'Government ID', government_id_last4: '' });
  const [message, setMessage] = useState('');
  const submit = async (event) => { event.preventDefault(); setMessage(''); const response = await fetch(`${DELIVERY_API_URL}/api/delivery-partner/application`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify(form) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return; } setMessage('Application submitted for Admin verification.'); onSaved(result.application); };
  return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> DELIVERY PARTNER ONBOARDING</div><h1>Application <em>pending</em></h1><p>Registration does not grant delivery access. Submit your details for Admin verification.</p></div></div><div className="availability-notice"><ShieldCheck size={20} /><div><strong>Application Pending Admin Verification</strong><span>You cannot accept or complete deliveries until an Admin verifies your documents and activates your account.</span></div></div><form className="review-form" onSubmit={submit}><div><span className="panel-kicker">PARTNER DETAILS</span><h2>Complete your application</h2><label className="field"><span>Full name</span><input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label><label className="field"><span>Mobile number</span><input required value={form.mobile_number} onChange={(event) => setForm({ ...form, mobile_number: event.target.value })} /></label><label className="field"><span>Email</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="field"><span>Operating location</span><input required value={form.operating_location} onChange={(event) => setForm({ ...form, operating_location: event.target.value })} /></label><label className="field"><span>Service area</span><input required placeholder="Hyderabad, Secunderabad" value={form.service_area} onChange={(event) => setForm({ ...form, service_area: event.target.value })} /></label></div><div><label className="field"><span>Vehicle type</span><select value={form.vehicle_type} onChange={(event) => setForm({ ...form, vehicle_type: event.target.value })}><option>Bike</option><option>Auto</option><option>Mini Truck</option><option>Truck</option></select></label><label className="field"><span>Vehicle number</span><input required value={form.vehicle_number} onChange={(event) => setForm({ ...form, vehicle_number: event.target.value })} /></label><label className="field"><span>Government ID type</span><input required value={form.government_id_type} onChange={(event) => setForm({ ...form, government_id_type: event.target.value })} /></label><label className="field"><span>Government ID last 4 digits</span><input required maxLength="4" value={form.government_id_last4} onChange={(event) => setForm({ ...form, government_id_last4: event.target.value.replace(/\W/g, '').slice(0, 4) })} /></label><label className="field checkbox-field"><input type="checkbox" checked={Boolean(form.location_permission)} onChange={(event) => setForm({ ...form, location_permission: event.target.checked })} /><span>Allow current location for delivery matching</span></label><button className="primary-button" type="submit"><Send size={16} /> Submit for verification</button></div></form>{message && <p className="auth-success">{message}</p>}</section>;
}

function OperationsDashboard({ orders }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void authHeaders().then((headers) => fetch(`${DELIVERY_API_URL}/api/delivery-partner/application`, { headers })).then((response) => response.json()).then((result) => { setApplication(result.application || null); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <section className="content-page page-enter"><div className="mini-empty">Loading partner application...</div></section>;
  if (!application || application.verification_status !== 'verified' || application.account_status !== 'active') return <DeliveryPartnerApplicationForm application={application} onSaved={setApplication} />;
  return <VerifiedOperationsDashboard orders={orders} application={application} onApplicationChange={setApplication} />;
}

function VerifiedOperationsDashboard({ orders, application, onApplicationChange }) {
  const [message, setMessage] = useState('');
  const availableOrders = orders.filter((order) => ['awaiting_partner', 'partner_notified'].includes(order.deliveryStatus || order.status));
  const activeOrders = orders.filter((order) => order.deliveryStatus === 'accepted');
  const setAvailability = async (availability_status) => { const response = await fetch(`${DELIVERY_API_URL}/api/delivery-partner/availability`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ availability_status }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return; } onApplicationChange(result.application); };
  const respond = async (order, partnerResponse) => { const session = await supabase.auth.getSession(); const response = await fetch(`${DELIVERY_API_URL}/api/assignments/${order.assignmentId}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ partnerId: session.data.session?.user.id, response: partnerResponse }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return; } window.dispatchEvent(new CustomEvent('farmdirect-delivery-update', { detail: { id: order.id, changes: { deliveryStatus: result.status, status: result.status === 'accepted' ? 'Accepted by delivery partner' : result.status, partner: application.full_name } } })); };
  const complete = async (order) => { const otp = window.prompt('Enter the delivery OTP from the buyer'); if (!otp) return; const response = await fetch(`${DELIVERY_API_URL}/api/assignments/${order.assignmentId}/delivery/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ otp }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return; } window.dispatchEvent(new CustomEvent('farmdirect-delivery-update', { detail: { id: order.id, changes: { deliveryStatus: result.status, status: 'Delivered' } } })); };
  useEffect(() => { if (!application.location_permission || !navigator.geolocation) return undefined; const watchId = navigator.geolocation.watchPosition(async (position) => { await fetch(`${DELIVERY_API_URL}/api/delivery-partner/location`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ current_location: { lat: position.coords.latitude, lng: position.coords.longitude } }) }); }, () => undefined, { enableHighAccuracy: true, maximumAge: 30000 }); return () => navigator.geolocation.clearWatch(watchId); }, [application.location_permission]);
  return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> VERIFIED DELIVERY PARTNER</div><h1>Delivery <em>control</em></h1><p>{application.location_permission ? 'Your permitted location helps match you to nearby suitable orders.' : 'Enable location permission in your application to be matched by live distance.'}</p></div><div className={`availability-toggle ${application.availability_status === 'available' ? 'online' : 'offline'}`}><span></span><strong>{application.availability_status}</strong><button onClick={() => setAvailability(application.availability_status === 'available' ? 'offline' : 'available')}>{application.availability_status === 'available' ? 'Go offline' : 'Go online'}</button></div></div>{message && <p className="auth-error">{message}</p>}{application.availability_status === 'available' && availableOrders.length > 0 && <div className="partner-panel delivery-requests"><div className="panel-heading"><div><span className="eyebrow muted">SERVER ASSIGNMENTS</span><h2>Delivery requests</h2></div><span>{availableOrders.length} waiting</span></div>{availableOrders.map((order) => <DeliveryPartnerOrder key={order.id} order={order} onAccept={() => respond(order, 'accept')} onReject={() => respond(order, 'decline')} />)}</div>}<div className="partner-panel"><div className="panel-heading"><div><span className="eyebrow muted">ACTIVE DELIVERIES</span><h2>Assigned to you</h2></div><span>{activeOrders.length} active</span></div>{activeOrders.map((order) => <DeliveryPartnerOrder key={order.id} order={order} onDelivered={() => complete(order)} />)}{activeOrders.length === 0 && <div className="mini-empty">No active deliveries.</div>}</div></section>;
}

function CustomerCareDashboard({ orders, produce }) {
  const openOrders = orders.filter((order) => !['delivered', 'rejected'].includes(order.deliveryStatus));
  const farmers = new Set(produce.map((item) => item.farmer)).size;
  return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> CUSTOMER CARE DESK</div><h1>Support <em>dashboard</em></h1><p>Keep an eye on orders, farmer listings, and the customers who need a quick answer.</p></div><a className="primary-button" href="mailto:support@farmersatoz.in"><Mail size={16} /> Email support</a></div><div className="dashboard-stats"><div><small>Open orders</small><strong>{openOrders.length}</strong><span>Need attention</span></div><div><small>Farmer listings</small><strong>{produce.length}</strong><span>{farmers} active farmers</span></div><div><small>Customers served</small><strong>{new Set(orders.map((order) => order.buyer).filter(Boolean)).size}</strong><span>From local orders</span></div><div><small>Support status</small><strong>Online</strong><span>Ready to respond</span></div></div><div className="hub-grid"><div className="hub-panel incoming"><div className="panel-heading"><div><div className="eyebrow muted">ORDER FOLLOW-UP</div><h2>Recent customer orders</h2></div><span>{openOrders.length} open</span></div>{openOrders.slice(0, 6).map((order) => <div className="listing-row" key={order.id}><div><strong>{order.buyer || 'Customer'}</strong><span>{order.name} · {order.status || order.deliveryStatus || 'Placed'}</span></div><b>{money(order.total || 0)}</b></div>)}{openOrders.length === 0 && <div className="mini-empty"><Check size={20} /> All orders are up to date.</div>}</div><aside className="hub-panel"><div className="panel-heading"><div><div className="eyebrow muted">CARE CHANNELS</div><h2>Reach the network</h2></div><Headphones size={20} /></div><div className="support-actions"><a className="whatsapp-cta" href={whatsappLink('+919876543210', 'Hello, I need help with my FarmDirect order.')} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a><a className="support-icon-link" href="tel:+919876543210" title="Call support"><Phone size={16} /></a><a className="support-icon-link" href="mailto:support@farmersatoz.in" title="Email support"><Mail size={16} /></a></div><div className="mini-empty"><ShieldCheck size={19} /> Verify the order ID before sharing delivery details.</div></aside></div></section>;
}

function DeliveryPartnerOrder({ order, onAccept, onReject, onDelivered }) {
  return <div className="partner-order action-order"><div><strong>{order.name}</strong><span>{order.buyer || 'Buyer'} · {order.address || 'Address pending'} · {order.distanceKm || 0} km</span><small>{order.quantity} {order.unit} · {order.deliveryWindow || 'Flexible timing'}</small><small className="earnings-line">Farmer receives {money(order.productTotal || Math.max(0, order.total - (order.deliveryCharge || 0)))} · You earn {money(order.deliveryCharge || 0)}</small></div><div className="partner-order-actions">{onAccept && <button className="accept-button" onClick={onAccept}><Check size={14} /> Accept</button>}{onReject && <button className="reject-button" onClick={onReject}><X size={14} /> Reject</button>}{onDelivered && <button className="accept-button" onClick={onDelivered}><PackageCheck size={14} /> Mark delivered</button>}</div></div>;
}

function DeliveryRouteMap({ orders }) {
  const partnerName = 'GreenRoute Partner';
  const partnerLocation = partnerLocations[partnerName];
  const stops = orders.filter((order) => order.partner).map((order) => ({ order, stopDistance: distanceBetween(partnerLocation, order.dropoff) })).sort((first, second) => first.stopDistance - second.stopDistance);
  const positions = [{ x: 18, y: 62 }, { x: 38, y: 35 }, { x: 61, y: 57 }, { x: 82, y: 28 }, { x: 74, y: 78 }, { x: 42, y: 82 }];
  const points = stops.slice(0, positions.length).map((stop, index) => ({ ...stop, ...positions[index] }));
  const totalDistance = points.reduce((sum, point) => sum + (Number.isFinite(point.stopDistance) ? point.stopDistance : point.order.distanceKm || 0), 0);
  return <div className="route-board"><div className="route-board-heading"><div><div className="eyebrow muted">ROUTE PLANNER</div><h2>Best route for the next run</h2><p>Nearest stops first, using the partner's current location.</p></div><div className="route-summary"><strong>{points.length}</strong><span>stops</span><strong>{totalDistance.toFixed(1)} km</strong><span>estimated route</span></div></div>{points.length === 0 ? <div className="route-empty"><Route size={22} /><span>Assign orders to a partner to build the route map.</span></div> : <div className="route-layout"><div className="route-map" aria-label="Schematic delivery route map">{points.slice(1).map((point, index) => { const previous = points[index]; const dx = point.x - previous.x; const dy = point.y - previous.y; return <i className="route-line" key={`${previous.order.id}-${point.order.id}`} style={{ left: `${previous.x}%`, top: `${previous.y}%`, width: `${Math.sqrt(dx * dx + dy * dy)}%`, transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)` }} />; })}{points.map((point, index) => <div className="route-stop" key={point.order.id} style={{ left: `${point.x}%`, top: `${point.y}%` }}><b>{index + 1}</b><span>{point.order.buyer}</span></div>)}<div className="route-origin"><Sprout size={15} /> Farm hub</div></div><div className="route-stop-list">{points.map((point, index) => <div className="route-stop-row" key={point.order.id}><b>{index + 1}</b><div><strong>{point.order.buyer}</strong><span>{point.order.address || 'Address pending'}</span></div><small>{(Number.isFinite(point.stopDistance) ? point.stopDistance : point.order.distanceKm || 0).toFixed(1)} km</small></div>)}</div></div>}</div>;
}

function Reviews() {
  const [reviews, setReviews] = useState(() => load('farmdirect-reviews-v2', []));
  const [farmer, setFarmer] = useState(seedProduce[0].farmer);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const submit = (event) => { event.preventDefault(); if (!text.trim()) return; const nextReview = { id: `review-${Date.now()}`, name: 'FarmDirect customer', role: 'Buyer', farmer, rating, text: text.trim() }; setReviews((current) => { const next = [nextReview, ...current]; localStorage.setItem('farmdirect-reviews-v2', JSON.stringify(next)); return next; }); setText(''); setRating(5); };
  return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> TRUST ACROSS THE NETWORK</div><h1>Reviews & <em>feedback</em></h1><p>Share helpful feedback about the farmers who grow your food.</p></div></div><div className="review-grid">{reviews.map((review) => <article className="review-card" key={review.id}><div className="review-top"><div className="review-avatar"><UserRound size={17} /></div><div><strong>{review.name}</strong><span>{review.role} · {review.farmer}</span></div><div className="stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < review.rating ? 'currentColor' : 'none'} />)}</div></div><p>{review.text}</p></article>)}</div><form className="review-form" onSubmit={submit}><div><span className="panel-kicker">REVIEW A FARMER</span><h2>Help the next buyer choose well.</h2><label className="field"><span>Farmer</span><select value={farmer} onChange={(event) => setFarmer(event.target.value)}>{seedProduce.map((item) => <option key={item.farmer}>{item.farmer}</option>)}</select></label><label className="field"><span>Rating</span><select value={rating} onChange={(event) => setRating(Number(event.target.value))}><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label></div><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a review about this farmer or their produce..." rows="4" required /><button className="primary-button" type="submit"><Star size={16} /> Publish review</button></form></section>;
}


function TractorIcon({ size = 17 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 15h2l1-4h9l2 4h3" /><circle cx="8" cy="16" r="2.5" /><circle cx="17" cy="16" r="2.5" /><path d="M9 11V8h6l2 3" /><path d="M5 15V9h2" /></svg>; }

function MachinerySharing({ machinery, bookings, onAddMachine, onRequestMachine }) {
  const [listing, setListing] = useState({ name: '', type: 'Tractor', capacity: '', rate: '', location: '', availableFrom: '', availableTo: '', owner: '', image: '' });
  const [booking, setBooking] = useState({ machineId: machinery[0]?.id || '', requestDate: '', durationDays: 1, requester: '', phone: '' });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (booking.machineId === '' && machinery[0]) setBooking((current) => ({ ...current, machineId: machinery[0].id }));
  }, [machinery, booking.machineId]);

  const submitListing = (event) => {
    event.preventDefault();
    if (!listing.name || !listing.location || !listing.rate) {
      setNotice('Add the equipment name, location, and daily rate before listing.');
      return;
    }
    onAddMachine({ ...listing, rate: Number(listing.rate), durationDays: 1, status: 'Available' });
    setNotice(`${listing.name} has been listed for sharing.`);
    setListing({ name: '', type: 'Tractor', capacity: '', rate: '', location: '', availableFrom: '', availableTo: '', owner: '', image: '' });
  };

  const submitBooking = (event) => {
    event.preventDefault();
    if (!booking.machineId || !booking.requestDate || !booking.requester) {
      setNotice('Choose a machine, pick a date, and add the requester name.');
      return;
    }
    onRequestMachine({ ...booking, durationDays: Number(booking.durationDays || 1), machineId: Number(booking.machineId) });
    setNotice(`Request sent for ${new Date(booking.requestDate).toLocaleDateString('en-IN')}.`);
    setBooking((current) => ({ ...current, requestDate: '', durationDays: 1, requester: '', phone: '' }));
  };

  return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> FARM MACHINERY SHARING</div><h1>Shared equipment <em>for hire</em></h1><p>Farmers can list tractors, harvesters, sprayers, and other tools and request them on specific dates instead of buying each machine separately.</p></div></div><div className="hub-grid"><div className="hub-panel"><div className="panel-heading"><div><div className="eyebrow muted">LIST A MACHINE</div><h2>Rent out your equipment</h2></div></div><form className="review-form" onSubmit={submitListing}><label className="field"><span>Machine name</span><input required value={listing.name} onChange={(event) => setListing((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Tractor 575" /></label><div className="delivery-fields"><label className="field"><span>Type</span><select value={listing.type} onChange={(event) => setListing((current) => ({ ...current, type: event.target.value }))}><option>Tractor</option><option>Harvester</option><option>Sprayer</option><option>Seeder</option><option>Rotavator</option><option>Trailer</option><option>Weeder</option></select></label><label className="field"><span>Capacity</span><input value={listing.capacity} onChange={(event) => setListing((current) => ({ ...current, capacity: event.target.value }))} placeholder="45 HP / 200 L" /></label></div><div className="delivery-fields"><label className="field"><span>Daily rate (₹)</span><input required type="number" min="1" value={listing.rate} onChange={(event) => setListing((current) => ({ ...current, rate: event.target.value }))} placeholder="2200" /></label><label className="field"><span>Owner</span><input value={listing.owner} onChange={(event) => setListing((current) => ({ ...current, owner: event.target.value }))} placeholder="Your name" /></label></div><div className="delivery-fields"><label className="field"><span>Location</span><input required value={listing.location} onChange={(event) => setListing((current) => ({ ...current, location: event.target.value }))} placeholder="Warangal, Telangana" /></label><label className="field"><span>Image URL</span><input value={listing.image} onChange={(event) => setListing((current) => ({ ...current, image: event.target.value }))} placeholder="Optional image URL" /></label></div><div className="delivery-fields"><label className="field"><span>Available from</span><input type="date" value={listing.availableFrom} onChange={(event) => setListing((current) => ({ ...current, availableFrom: event.target.value }))} /></label><label className="field"><span>Available to</span><input type="date" value={listing.availableTo} onChange={(event) => setListing((current) => ({ ...current, availableTo: event.target.value }))} /></label></div><button className="primary-button" type="submit">List machine</button>{notice && <p className="auth-success">{notice}</p>}</form></div><div className="hub-panel incoming"><div className="panel-heading"><div><div className="eyebrow muted">REQUEST A MACHINE</div><h2>Book for a date</h2></div></div><form className="review-form" onSubmit={submitBooking}><label className="field"><span>Machine</span><select value={booking.machineId} onChange={(event) => setBooking((current) => ({ ...current, machineId: event.target.value }))}>{machinery.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type}</option>)}</select></label><div className="delivery-fields"><label className="field"><span>Request date</span><input required type="date" value={booking.requestDate} onChange={(event) => setBooking((current) => ({ ...current, requestDate: event.target.value }))} /></label><label className="field"><span>Days</span><input type="number" min="1" max="30" value={booking.durationDays} onChange={(event) => setBooking((current) => ({ ...current, durationDays: event.target.value }))} /></label></div><div className="delivery-fields"><label className="field"><span>Farmer name</span><input required value={booking.requester} onChange={(event) => setBooking((current) => ({ ...current, requester: event.target.value }))} placeholder="Your name" /></label><label className="field"><span>Phone</span><input value={booking.phone} onChange={(event) => setBooking((current) => ({ ...current, phone: event.target.value }))} placeholder="WhatsApp number" /></label></div><button className="primary-button" type="submit">Request machine</button></form></div></div><div className="input-shop"><div className="panel-heading"><div><div className="eyebrow muted">AVAILABLE EQUIPMENT</div><h2>Shared machinery list</h2></div><span>{machinery.length} machines</span></div><div className="input-grid">{machinery.map((item) => <article className="input-card" key={item.id}><img className="input-photo" src={item.image || '/assets/farm-market-hero.jpg'} alt={item.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/farm-market-hero.jpg'; }} /><div className="input-card-content"><span className="input-type">{item.type}</span><h3>{item.name}</h3><strong>₹{item.rate.toLocaleString('en-IN')}/day</strong><small>{item.capacity}</small><p>{item.location}</p><small>{item.availableFrom && item.availableTo ? `Available ${new Date(`${item.availableFrom}T00:00:00`).toLocaleDateString('en-IN')} to ${new Date(`${item.availableTo}T00:00:00`).toLocaleDateString('en-IN')}` : 'Flexible dates available'}</small><button className="buy-input" type="button" onClick={() => setBooking((current) => ({ ...current, machineId: String(item.id) }))}>Request this machine</button></div></article>)}</div></div>{bookings.length > 0 && <div className="hub-panel incoming" style={{ marginTop: '1.5rem' }}><div className="panel-heading"><div><div className="eyebrow muted">BOOKING REQUESTS</div><h2>Recent requests</h2></div></div>{bookings.slice(0, 5).map((bookingItem) => { const machine = machinery.find((entry) => entry.id === Number(bookingItem.machineId)); return <div className="incoming-row" key={bookingItem.id}><div><strong>{machine ? machine.name : 'Machine'} · {bookingItem.requester || 'Farmer'}</strong><span>{bookingItem.requestDate ? new Date(`${bookingItem.requestDate}T00:00:00`).toLocaleDateString('en-IN') : 'Date pending'} · {bookingItem.durationDays || 1} day(s)</span></div><b>{bookingItem.phone || 'Call request'}</b></div>; })}</div>}</section>;
}

function FarmerSuggestions({ produce }) {
  const suggestions = produce.some((item) => item.category === 'Flowers') ? ['Bundle marigolds with a morning delivery slot for hotels.', 'Add a repeat supply offer for caterers before festival weeks.'] : ['Use Demand Radar before planting your next batch.', 'Add a clear harvest date and production method to improve buyer trust.'];
  const openNearbyMarkets = () => { const button = Array.from(document.querySelectorAll('.desktop-nav button')).find((item) => item.textContent.includes('Nearby markets')); button?.click(); };
  return <section className="suggestions-panel"><button type="button" className="farmer-market-launch" onClick={openNearbyMarkets}><span><MapPin size={24} /></span><div><strong>Find nearby markets & buyers</strong><small>Rythu bazaars, APMC markets, buyers, and travel costs</small></div><ArrowRight size={19} /></button><div className="eyebrow muted">FARMER COACH</div><h2>Suggestions for your next sale</h2><div className="suggestion-list">{suggestions.map((suggestion) => <div key={suggestion}><Sprout size={16} /><span>{suggestion}</span></div>)}</div></section>;
}
function OrderModal({ item, onClose, onPlace }) { const [quantity, setQuantity] = useState(1); const [buyer, setBuyer] = useState(''); const [address, setAddress] = useState(''); const [distanceKm, setDistanceKm] = useState(5); const [deliveryWindow, setDeliveryWindow] = useState('30 minutes'); const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery'); const [buyerType, setBuyerType] = useState(item.buyerType || 'Household'); const productTotal = quantity * item.farmPrice; const deliveryCharge = distanceKm * deliveryChargePerKm; const total = productTotal + deliveryCharge; return <div className="modal-backdrop"><div className="modal"><button className="close-button" onClick={onClose}><X size={19} /></button><div className={`modal-image produce-image ${item.color}`}>{produceImages[item.id] ? <img className="produce-photo" src={produceImages[item.id]} alt={item.name} /> : <div className="produce-illustration"><span></span><span></span><span></span></div>}</div><div className="modal-content"><div className="eyebrow muted">DIRECT FROM {item.farm.toUpperCase()}</div><h2>{item.name}</h2><p className="modal-description">{item.description}</p><div className="quantity-control"><span>Quantity <small>({item.quantity} {item.unit} available)</small></span><div><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><strong>{quantity}</strong><button onClick={() => setQuantity(Math.min(item.quantity, quantity + 1))}><Plus size={15} /></button></div></div><label className="field"><span>Your name</span><input value={buyer} onChange={(event) => setBuyer(event.target.value)} placeholder="e.g. Priya Sharma" /></label><label className="field"><span>Delivery address</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Where should we bring it?" /></label><div className="delivery-fields"><label className="field"><span>Distance (km)</span><input type="number" min="1" value={distanceKm} onChange={(event) => setDistanceKm(Math.max(1, Number(event.target.value) || 1))} /></label><label className="field"><span>Delivery timing</span><select value={deliveryWindow} onChange={(event) => setDeliveryWindow(event.target.value)}><option>30 minutes</option><option>Today evening</option><option>Tomorrow morning</option><option>Choose with partner</option></select></label></div><label className="field"><span>Buying for</span><select value={buyerType} onChange={(event) => setBuyerType(event.target.value)}>{buyerTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="field payment-field"><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash on Delivery</option><option>PhonePe</option><option>Google Pay</option></select></label><div className="delivery-breakdown"><span><Route size={14} /> {distanceKm} km x ₹{deliveryChargePerKm}</span><strong>Delivery {money(deliveryCharge)}</strong></div><div className="order-summary"><span>Farmers A to Z total <strong>{money(total)}</strong></span><span className="summary-saving">You save {money(quantity * (item.middlemanPrice - item.farmPrice))}</span></div><button className="primary-button full-button" disabled={!buyer || !address} onClick={() => onPlace(item, quantity, buyer, address, distanceKm, deliveryWindow, paymentMethod, buyerType)}><Check size={17} /> Place direct order</button></div></div></div>; }

function AddListingLegacy({ onClose, onAdd }) { const [form, setForm] = useState({ name: '', category: 'Vegetables', farmPrice: '', unit: 'kg', quantity: '', farmer: 'Your name', farm: 'Your farm', location: 'Your location', organic: true, harvest: 'Freshly harvested', description: 'Fresh produce, grown with care.' }); const update = (key, value) => setForm((current) => ({ ...current, [key]: value })); const submit = (event) => { event.preventDefault(); onAdd({ ...form, farmPrice: Number(form.farmPrice), middlemanPrice: Number(form.farmPrice) * 1.7, quantity: Number(form.quantity) }); }; return <div className="modal-backdrop"><form className="modal add-modal" onSubmit={submit}><button type="button" className="close-button" onClick={onClose}><X size={19} /></button><div className="eyebrow"><span></span> NEW HARVEST</div><h2>List your produce</h2><p className="modal-description">Put a fair price on what you grow and let the right buyers find you.</p><div className="form-grid"><label className="field wide"><span>Produce name</span><input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Red Lady Papaya" /></label><label className="field"><span>Category</span><select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Unit</span><select value={form.unit} onChange={(event) => update('unit', event.target.value)}><option>kg</option><option>dozen</option><option>litre</option><option>crate</option></select></label><label className="field"><span>Farm price (₹)</span><input required type="number" min="1" value={form.farmPrice} onChange={(event) => update('farmPrice', event.target.value)} /></label><label className="field"><span>Quantity available</span><input required type="number" min="1" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /></label><label className="field wide"><span>Farm name</span><input value={form.farm} onChange={(event) => update('farm', event.target.value)} /></label><label className="field wide"><span>Location</span><input value={form.location} onChange={(event) => update('location', event.target.value)} /></label></div><button className="primary-button full-button" type="submit"><Sprout size={17} /> Publish listing</button></form></div>; }

const listingLabels = {
  en: { kicker: 'NEW HARVEST', title: 'List your produce', intro: 'Add clear details so buyers know exactly what they are ordering and who grew it.', produce: 'Produce details', name: 'Produce name', category: 'Category', soldBy: 'Sold by', price: 'Price and stock', farmPrice: 'Your farm price (₹ / unit)', marketPrice: 'Typical market price (₹ / unit)', quantity: 'Available quantity', method: 'Production method', organic: 'Organically grown', farm: 'Farm details', farmer: 'Farmer name', phone: 'WhatsApp number', farmName: 'Farm name', location: 'Farm location', harvest: 'Harvest note', description: 'Short description', photo: 'Product photo', addPhoto: 'Add a photo', changePhoto: 'Change photo', publish: 'Publish listing' },
  hi: { kicker: 'नई फसल', title: 'अपनी फसल सूचीबद्ध करें', intro: 'खरीदारों को आपकी फसल और उसे उगाने वाले किसान की पूरी जानकारी दें।', produce: 'फसल की जानकारी', name: 'फसल का नाम', category: 'श्रेणी', soldBy: 'इकाई', price: 'कीमत और स्टॉक', farmPrice: 'आपके खेत की कीमत (₹ / इकाई)', marketPrice: 'बाजार कीमत (₹ / इकाई)', quantity: 'उपलब्ध मात्रा', method: 'उत्पादन विधि', organic: 'जैविक रूप से उगाया गया', farm: 'खेत की जानकारी', farmer: 'किसान का नाम', phone: 'व्हाट्सऐप नंबर', farmName: 'खेत का नाम', location: 'खेत का स्थान', harvest: 'फसल विवरण', description: 'संक्षिप्त विवरण', photo: 'उत्पाद की फोटो', addPhoto: 'फोटो जोड़ें', changePhoto: 'फोटो बदलें', publish: 'फसल प्रकाशित करें' },
  te: { kicker: 'కొత్త పంట', title: 'మీ పంటను జాబితా చేయండి', intro: 'కొనుగోలుదారులకు పంట మరియు రైతు గురించి పూర్తి వివరాలు ఇవ్వండి.', produce: 'పంట వివరాలు', name: 'పంట పేరు', category: 'వర్గం', soldBy: 'కొలత', price: 'ధర మరియు స్టాక్', farmPrice: 'మీ పొలం ధర (₹ / యూనిట్)', marketPrice: 'మార్కెట్ ధర (₹ / యూనిట్)', quantity: 'అందుబాటులో ఉన్న పరిమాణం', method: 'ఉత్పత్తి విధానం', organic: 'సేంద్రీయంగా పండించినది', farm: 'పొలం వివరాలు', farmer: 'రైతు పేరు', phone: 'వాట్సాప్ నంబర్', farmName: 'పొలం పేరు', location: 'పొలం ప్రాంతం', harvest: 'కోత వివరాలు', description: 'సంక్షిప్త వివరణ', photo: 'ఉత్పత్తి ఫోటో', addPhoto: 'ఫోటో జోడించండి', changePhoto: 'ఫోటో మార్చండి', publish: 'పంటను ప్రచురించండి' }
};

function AddListing({ onClose, onAdd, language = 'en', initialName = '' }) {
  const [form, setForm] = useState({ name: initialName, category: 'Vegetables', farmPrice: '', middlemanPrice: '', unit: 'kg', quantity: '', farmer: '', farmerPhone: '', farm: '', location: '', organic: true, productionMethod: 'Organic', harvest: '', pickedStatus: 'Picked just now', expiryDate: '', freshnessScore: '', description: '', photo: '' });
  const [verification, setVerification] = useState(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanStatus, setScanStatus] = useState({ score: 0, rejected: false, reason: '' });
  const labels = listingLabels[language] || listingLabels.en;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const voiceNumber = (key, text) => {
    const cleaned = text.replace(/[^\d.]/g, '');
    if (!cleaned) return;
    update(key, cleaned);
  };
  const voicePhone = (text) => {
    const cleaned = text.replace(/[^\d+\s-]/g, '');
    if (!cleaned) return;
    update('farmerPhone', cleaned);
  };
  const capturePhoto = (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => update('photo', reader.result); reader.readAsDataURL(file); };
  const apiUrl = import.meta.env.VITE_DELIVERY_API_URL || 'http://localhost:8787';
  useEffect(() => {
    let active = true;
    const runScan = async () => {
      const result = await analyzeProduceScan(form);
      if (active) setScanStatus(result);
    };
    void runScan();
    return () => { active = false; };
  }, [form.name, form.description, form.expiryDate, form.pickedStatus, form.productionMethod, form.photo, form.harvest, form.category]);
  const freshnessScore = scanStatus.score || calculateAiFreshnessScore(form);
  const publish = async (photo = form.photo, verificationToken = verification?.verificationToken) => {
    setBusy(true); setError('');
    try {
      const scanResult = await analyzeProduceScan({ ...form, photo });
      setScanStatus(scanResult);
      if (scanResult.rejected || scanResult.score < 75) {
        throw new Error(`${scanResult.reason} Score: ${scanResult.score}/100. This listing cannot be published.`);
      }
      if (!form.expiryDate) throw new Error('Add an expiry date before publishing.');
      let uploadedPhoto = photo;
      if (photo) {
        try {
          const uploadResponse = await fetch(`${apiUrl}/api/uploads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData: photo, verificationToken }) });
          const uploadResult = await uploadResponse.json();
          if (!uploadResponse.ok) throw new Error(uploadResult.error || 'Image upload failed.');
          uploadedPhoto = `${apiUrl}${uploadResult.url}`;
        } catch (uploadError) {
          if (!(uploadError instanceof TypeError)) throw uploadError;
          uploadedPhoto = photo;
        }
      }
      onAdd({ ...form, photo: uploadedPhoto, freshnessScore, farmPrice: Number(form.farmPrice), middlemanPrice: Number(form.middlemanPrice), quantity: Number(form.quantity), description: form.description || 'Fresh produce, grown with care.' });
    } catch (uploadError) { setError(uploadError.message); } finally { setBusy(false); }
  };
  const requestVerification = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${apiUrl}/api/upload-verification/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: form.farmerPhone }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send WhatsApp code.');
      setVerification(result);
      if (result.devOtp) setOtp(result.devOtp);
    } catch (requestError) {
      if (requestError instanceof TypeError && import.meta.env.DEV) { setVerification({ verificationToken: 'local-development' }); void publish(form.photo, 'local-development'); return; }
      setError(requestError.message);
    } finally { setBusy(false); }
  };
  const verifyAndPublish = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${apiUrl}/api/upload-verification/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: verification.challengeId, code: otp }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Verification failed.');
      setVerification({ ...verification, verificationToken: result.verificationToken });
      await publish(form.photo, result.verificationToken);
    } catch (verifyError) { setError(verifyError.message); setBusy(false); }
  };
  const submit = (event) => {
    event.preventDefault();
    if (!form.photo) { setError('Add a clear produce photo so AI can verify freshness before submission.'); return; }
    if (form.photo && !verification) { void requestVerification(); return; }
    if (form.photo && !verification.verificationToken) return;
    void publish();
  };
  return <div className="modal-backdrop"><form className="modal add-modal detailed-form" onSubmit={submit}>
    <button type="button" className="close-button" onClick={onClose}><X size={19} /></button>
    <div className="eyebrow"><span></span> {labels.kicker}</div><h2>{labels.title}</h2>
    <p className="modal-description">{labels.intro}</p>
    <div className="form-section-title"><Sprout size={16} /> {labels.produce}</div>
    <div className="form-grid">
      <label className="field wide"><span>{labels.name}</span><div className="voice-field"><input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Red Lady Papaya" /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => update('name', `${form.name} ${text}`.trim())} /></div></label>
      <label className="field"><span>{labels.category}</span><select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field"><span>{labels.soldBy}</span><select value={form.unit} onChange={(event) => update('unit', event.target.value)}><option>kg</option><option>dozen</option><option>litre</option><option>crate</option><option>bunch</option></select></label>
    </div>
    <div className="form-section-title"><CircleDollarSign size={16} /> {labels.price}</div>
    <div className="form-grid">
      <label className="field"><span>{labels.farmPrice}</span><div className="voice-field"><input required type="number" min="1" value={form.farmPrice} onChange={(event) => update('farmPrice', event.target.value)} placeholder="22" /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => voiceNumber('farmPrice', text)} /></div></label>
      <label className="field"><span>{labels.marketPrice}</span><div className="voice-field"><input required type="number" min="1" value={form.middlemanPrice} onChange={(event) => update('middlemanPrice', event.target.value)} placeholder="45" /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => voiceNumber('middlemanPrice', text)} /></div></label>
      <label className="field"><span>{labels.quantity}</span><div className="voice-field"><input required type="number" min="1" step="0.1" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} placeholder="150" /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => voiceNumber('quantity', text)} /></div></label>
      <label className="field"><span>{labels.method}</span><select value={form.productionMethod} onChange={(event) => update('productionMethod', event.target.value)}><option>Organic</option><option>Natural</option><option>Conventional</option></select></label>
      <label className="field checkbox-field"><input type="checkbox" checked={form.organic} onChange={(event) => update('organic', event.target.checked)} /><span>{labels.organic}</span></label>
    </div>
    <div className="form-section-title"><MapPin size={16} /> {labels.farm}</div>
    <div className="form-grid">
      <label className="field"><span>{labels.farmer}</span><div className="voice-field"><input required value={form.farmer} onChange={(event) => update('farmer', event.target.value)} placeholder="Your full name" /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => update('farmer', `${form.farmer} ${text}`.trim())} /></div></label>
      <label className="field"><span>{labels.phone}</span><div className="voice-field"><input required type="tel" value={form.farmerPhone} onChange={(event) => update('farmerPhone', event.target.value)} placeholder="+91 98765 43210" /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={voicePhone} /></div></label>
      <label className="field"><span>{labels.farmName}</span><div className="voice-field"><input required value={form.farm} onChange={(event) => update('farm', event.target.value)} placeholder="Your farm or co-op" /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => update('farm', `${form.farm} ${text}`.trim())} /></div></label>
      <label className="field wide"><span>{labels.location}</span><div className="voice-field"><input required value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Village, district, state" /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => update('location', `${form.location} ${text}`.trim())} /></div></label>
      <label className="field wide"><span>{labels.harvest}</span><div className="voice-field"><input value={form.harvest} onChange={(event) => update('harvest', event.target.value)} placeholder="Harvested today, sun-dried last week..." /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => update('harvest', `${form.harvest} ${text}`.trim())} /></div></label>
      <label className="field"><span>Picked status</span><select value={form.pickedStatus} onChange={(event) => update('pickedStatus', event.target.value)}><option>Picked just now</option><option>Picked today</option><option>Picked before 2 days</option><option>Picked before 3 days</option><option>Harvested this week</option></select></label>
      <label className="field"><span>Expiry date</span><div className="voice-field"><input required type="date" value={form.expiryDate} onChange={(event) => update('expiryDate', event.target.value)} /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => { const value = text.match(/\d{4}-\d{2}-\d{2}/)?.[0]; if (value) update('expiryDate', value); }} /></div></label>
      <div className={`field ai-score-preview ${scanStatus.rejected ? 'scan-danger' : ''}`}><span>AI safety scan</span><strong>{freshnessScore}/100</strong><small>{scanStatus.rejected ? scanStatus.reason : verification?.verificationToken ? 'Verified and ready to publish.' : 'Preview score updates as you fill in the produce details.'}</small></div>
      {scanStatus.rejected && <div className="safety-danger-alert" role="alert"><AlertTriangle size={20} /><div><strong>DANGER: ITEM REJECTED</strong><span>Fungus, mold, spoilage, or an unsafe freshness signal was detected. Remove this item and upload a different produce photo.</span><a href={whatsappLink(WHATSAPP_HELP_LINE, 'Hello, I need help with a rejected produce safety scan.')} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp help: 7337470485</a></div></div>}
      <label className="field wide"><span>{labels.description}</span><div className="voice-field"><textarea rows="3" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Tell buyers how it is grown or what makes it special." /><VoiceInputButton language={language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN'} onTranscript={(text) => update('description', `${form.description} ${text}`.trim())} /></div></label>
      <label className="field wide photo-field"><span>{labels.photo}</span><span className="camera-input"><Camera size={16} /><b>{form.photo ? labels.changePhoto : labels.addPhoto}</b><small>{form.photo ? 'Tap to choose a different image' : 'Upload from your device or take a farm photo'}</small><input type="file" accept="image/*" capture="environment" onChange={capturePhoto} /></span>{form.photo && <img className="listing-preview" src={form.photo} alt="Harvest preview" />}</label>
    </div>
    {error && <p className="auth-error">{error}</p>}
    {verification && !verification.verificationToken && <div className="upload-verification"><strong><MessageCircle size={15} /> WhatsApp verification</strong><span>Enter the 6-digit code sent to {form.farmerPhone}.</span><input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="000000" /><button className="secondary-button" type="button" disabled={busy || otp.length !== 6} onClick={verifyAndPublish}>{busy ? 'Verifying...' : 'Verify & publish'}</button></div>}
    {!verification?.verificationToken && verification?.devOtp && <p className="auth-success">Development mode: code filled automatically.</p>}
    {!verification && <button className="primary-button full-button" type="submit" disabled={busy}><Sprout size={17} /> {busy ? 'Sending code...' : form.photo ? 'Verify WhatsApp & publish' : labels.publish}</button>}
  </form></div>;
}

function StaffAdminDashboard() {
  const [profiles, setProfiles] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const loadStaff = async () => { const response = await fetch(`${DELIVERY_API_URL}/api/admin/staff`, { headers: await authHeaders() }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setProfiles(result.profiles); };
  useEffect(() => { void loadStaff().catch((error) => setMessage(error.message)); }, []);
  const invite = async (event) => { event.preventDefault(); setMessage(''); const response = await fetch(`${DELIVERY_API_URL}/api/admin/customer-care`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ name, email }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return; } setName(''); setEmail(''); setMessage('Invitation created. The person must complete Supabase email setup before access.'); await loadStaff(); };
  const updateStatus = async (userId, account_status) => { const response = await fetch(`${DELIVERY_API_URL}/api/admin/staff/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ account_status }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return; } setProfiles((current) => current.map((profile) => profile.user_id === userId ? result.profile : profile)); };
  return <section className="content-page page-enter"><div className="page-header"><div><div className="eyebrow"><span></span> AUTHORIZED STAFF</div><h1>Admin <em>control</em></h1><p>Only the approved admin profile can appoint or disable staff access.</p></div></div><form className="review-form" onSubmit={invite}><div><span className="panel-kicker">APPOINT CUSTOMER CARE</span><h2>Invite a staff member</h2><label className="field"><span>Name</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field"><span>Email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div><button className="primary-button" type="submit"><ShieldCheck size={16} /> Invite customer care</button></form>{message && <p className="auth-error">{message}</p>}<div className="hub-panel"><div className="panel-heading"><div><span className="eyebrow muted">STAFF PROFILES</span><h2>Access control</h2></div><span>{profiles.length} staff</span></div>{profiles.map((profile) => <div className="listing-row" key={profile.user_id}><div><strong>{profile.name}</strong><span>{profile.email} · {profile.role} · {profile.account_status}</span></div><button className="secondary-button" onClick={() => updateStatus(profile.user_id, profile.account_status === 'pending' || profile.account_status === 'disabled' ? 'approved' : 'disabled')}>{profile.account_status === 'approved' ? 'Disable' : 'Approve'}</button></div>)}</div></section>;
}

function DeliveryPartnerReview() {
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState('');
  const load = async () => { const response = await fetch(`${DELIVERY_API_URL}/api/admin/delivery-partners`, { headers: await authHeaders() }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setApplications(result.applications); };
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);
  const review = async (userId, verification_status) => { const response = await fetch(`${DELIVERY_API_URL}/api/admin/delivery-partners/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ verification_status }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return; } setApplications((current) => current.map((application) => application.user_id === userId ? result.application : application)); };
  return <div className="hub-panel"><div className="panel-heading"><div><span className="eyebrow muted">DELIVERY PARTNER REVIEW</span><h2>Verification queue</h2></div><span>{applications.filter((application) => application.verification_status === 'pending').length} pending</span></div>{applications.map((application) => <div className="listing-row" key={application.user_id}><div><strong>{application.full_name}</strong><span>{application.vehicle_type} · {application.service_area} · {application.vehicle_number}</span><small>{application.government_id_type} ending {application.government_id_last4} · {application.verification_status}</small></div>{application.verification_status === 'pending' && <div><button className="accept-button" onClick={() => review(application.user_id, 'verified')}><Check size={14} /> Verify & activate</button><button className="reject-button" onClick={() => review(application.user_id, 'rejected')}><X size={14} /> Reject</button></div>}</div>)}{message && <p className="auth-error">{message}</p>}{applications.length === 0 && <div className="mini-empty">No delivery partner applications.</div>}</div>;
}

function AdminDashboard() {
  return <><StaffAdminDashboard /><section className="content-page page-enter"><DeliveryPartnerReview /></section></>;
}

function AuthModal({ mode, onModeChange, onClose, onAuthenticated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('consumer');
  const [loginRole, setLoginRole] = useState('consumer');
  const [buyerType, setBuyerType] = useState('Household');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isReset = mode === 'reset';
  const isChangePassword = mode === 'change-password';

  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (!supabase) throw new Error('Supabase authentication is not configured.');
      if (isChangePassword) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
        await supabase.auth.signOut();
        setPassword('');
        setMessage('Password changed successfully. You can now log in.');
        onModeChange('login');
        return;
      }
      if (isReset) { const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: window.location.origin }); if (resetError) throw resetError; setMessage('Check your email for a password reset link.'); return; }
      if (mode === 'register') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { name: name.trim(), role: registerRole, buyer_type: buyerType } }
        });
        if (signUpError) throw signUpError;
        if (!signUpData?.user) throw new Error('Account creation did not return a user. Please try again.');
        if (!signUpData.session) {
          setMessage('Account created. Email confirmation is still enabled in Supabase. Disable Confirm email in Authentication > Providers > Email, then try logging in.');
          return;
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw signInError;
        if (!signInData?.session) throw new Error('Login did not return a session. Check your Supabase Auth configuration.');
      }
      await supabase.auth.updateUser({ data: { buyer_type: buyerType } });
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        throw new Error('Your account session is not ready yet. Please wait a moment and try again.');
      }
      const result = await getAuthenticatedProfile(token);
      if (mode === 'login' && result.profile.role !== loginRole) throw new Error(`This account is registered as ${result.profile.role.replace('_', ' ')}.`);
      onAuthenticated({ ...result.user, ...result.profile, buyerType });
    } catch (authError) {
      const authMessage = authError.message || 'Authentication failed.';
      setError(authMessage.toLowerCase().includes('signups') || authMessage.toLowerCase().includes('signup')
        ? 'Email signups are disabled in Supabase. Enable Allow new users to sign up and the Email provider in Authentication settings.'
        : authMessage);
    } finally { setBusy(false); }
  };

  const title = isChangePassword ? 'Choose a new password' : isReset ? 'Reset your password' : mode === 'register' ? 'Create your account' : 'Welcome back';
  return <div className="modal-backdrop"><div className="modal auth-modal">
    <button className="close-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
    <div className="auth-panel"><div className="auth-icon"><KeyRound size={25} /></div><div className="eyebrow"><span></span> FARMERS A TO Z</div><h2>{title}</h2><p>{isChangePassword ? 'Enter a new password for your account.' : isReset ? 'We will send a password reset link to your email address.' : mode === 'register' ? 'Create a Consumer, Farmer, or Delivery Partner account with your email and password.' : 'Keep your orders, savings, and farm connections together.'}</p></div>
    <form className="auth-form" onSubmit={submit}>
      {!isReset && !isChangePassword && mode === 'register' && <label className="field"><span>Full name</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" /></label>}
      {!isChangePassword && <label className="field"><span><Mail size={12} /> Email address</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>}
      {isChangePassword ? <label className="field"><span><LockKeyhole size={12} /> New password</span><input required minLength="6" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label> : !isReset && <label className="field"><span><LockKeyhole size={12} /> Password</span><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>}
      {!isReset && mode === 'register' && <label className="field"><span>Account type</span><select value={registerRole} onChange={(event) => setRegisterRole(event.target.value)}><option value="consumer">Consumer</option><option value="farmer">Farmer</option><option value="delivery_partner">Delivery Partner</option></select></label>}
      {!isReset && !isChangePassword && mode === 'login' && <label className="field"><span>Login as</span><select value={loginRole} onChange={(event) => setLoginRole(event.target.value)}><option value="consumer">Consumer</option><option value="farmer">Farmer</option><option value="delivery_partner">Delivery Partner</option><option value="customer_care">Customer Care</option><option value="admin">Admin</option></select></label>}
      {!isReset && !isChangePassword && (registerRole === 'consumer' || (mode === 'login' && loginRole === 'consumer')) && <label className="field"><span>Buying for</span><select value={buyerType} onChange={(event) => setBuyerType(event.target.value)}><option>Household</option><option>Caterer</option><option>Supermarket</option><option>Retailer</option></select></label>}
      {error && <p className="auth-error">{error}</p>}{message && <p className="auth-success">{message}</p>}
      <button className="primary-button full-button" type="submit" disabled={busy}>{isChangePassword ? <><LockKeyhole size={16} /> Change password</> : isReset ? <><Mail size={16} /> Send reset link</> : mode === 'register' ? <><LogIn size={16} /> Create account</> : <><LogIn size={16} /> Log in</>}</button>
      {!isReset && mode === 'login' && <button className="text-button" type="button" onClick={() => onModeChange('reset')}>Forgot password?</button>}
      {isChangePassword || isReset ? <button className="text-button" type="button" onClick={() => onModeChange('login')}>Back to login</button> : <p className="auth-switch">{mode === 'register' ? 'Already have an account?' : 'New to Farmers A to Z?'} <button type="button" onClick={() => onModeChange(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Log in' : 'Create account'}</button></p>}
    </form>
  </div></div>;
}

function PaymentScannerHost() {
  const [scanning, setScanning] = useState(false);
  const [qrPayment, setQrPayment] = useState(null);
  useEffect(() => {
    const handlePaymentChoice = (event) => {
      if (event.target.matches('.payment-field select') && ['PhonePe', 'Google Pay'].includes(event.target.value)) {
        const checkout = event.target.closest('.cart-list, .modal-content');
        const totalText = checkout?.querySelector('.order-summary strong')?.textContent || checkout?.querySelector('.cart-total strong')?.textContent || '0';
        const deliveryText = checkout?.querySelector('.delivery-breakdown strong')?.textContent || '';
        const amount = (Number(totalText.replace(/[^0-9.]/g, '')) || 0) + (checkout?.querySelector('.order-summary strong') ? 0 : Number(deliveryText.replace(/[^0-9.]/g, '')) || 0);
        setQrPayment({ method: event.target.value, amount });
      }
    };
    document.addEventListener('change', handlePaymentChoice);
    return () => document.removeEventListener('change', handlePaymentChoice);
  }, []);
  if (scanning) return <PaymentScanner onClose={() => setScanning(false)} onScan={(value) => { setScanning(false); window.location.href = value; }} />;
  if (!qrPayment) return null;
  return <UpiQrModal method={qrPayment.method} amount={qrPayment.amount} onClose={() => setQrPayment(null)} onScan={() => { setQrPayment(null); setScanning(true); }} onOpenApp={() => { openPaymentApp(qrPayment.method, qrPayment.amount); setQrPayment(null); }} />;
}

function CropEmergency() {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState('pests');
  const emergencies = {
    pests: { label: 'Sudden pest attack', severity: 'Act within 2 hours', color: 'critical', steps: ['Separate affected plants or crates from healthy stock.', 'Photograph the leaves, insects, and the underside of damage.', 'Do not spray or sell the crop until a farm advisor confirms the treatment.'], contact: 'Hello, I have a sudden pest attack. I have isolated the crop and need urgent guidance.' },
    disease: { label: 'Leaf disease or rot', severity: 'Act today', color: 'critical', steps: ['Stop overhead watering and improve airflow around the crop.', 'Remove visibly infected leaves into a sealed bag; do not compost them.', 'Send clear photos and the crop name to the farm advisor before applying treatment.'], contact: 'Hello, I found possible leaf disease or rot. Please help me identify the crop problem.' },
    weather: { label: 'Storm, flood, or heat damage', severity: 'Protect within 30 minutes', color: 'warning', steps: ['Move harvested food into shade and keep it off wet soil.', 'Record photos of the field, crates, and water or heat damage.', 'Call support before dispatching any food with damaged packaging or uncertain safety.'], contact: 'Hello, my farm has weather damage. I need urgent advice on protecting the crop and current orders.' },
    quality: { label: 'Food quality or safety concern', severity: 'Do not dispatch', color: 'critical', steps: ['Pause the affected order and keep the food isolated.', 'Check smell, color, temperature, packaging, and harvest time.', 'Contact the quality desk before delivery; never hide or mix questionable food.'], contact: 'Hello, I have a food quality concern and have paused dispatch. I need an urgent quality review.' }
  };
  const selected = emergencies[problem];
  return <><button className="crop-emergency-button" type="button" onClick={() => setOpen(true)}><AlertTriangle size={17} /> Crop emergency</button>{open && <div className="modal-backdrop"><section className="crop-emergency-modal" role="dialog" aria-modal="true" aria-labelledby="crop-emergency-title"><button className="close-button" type="button" onClick={() => setOpen(false)} aria-label="Close crop emergency"><X size={19} /></button><div className="crop-emergency-kicker"><AlertTriangle size={15} /> FARMER PRIORITY SUPPORT</div><h2 id="crop-emergency-title">What happened?</h2><p className="modal-description">Choose the closest problem to get the next safest action.</p><div className="emergency-problem-grid">{Object.entries(emergencies).map(([key, item]) => <button type="button" className={problem === key ? 'selected' : ''} key={key} onClick={() => setProblem(key)}>{item.label}</button>)}</div><div className={`emergency-action-card ${selected.color}`}><div className="emergency-action-heading"><div><span className="panel-kicker">DO THIS NOW</span><h3>{selected.severity}</h3></div><Clock3 size={20} /></div><ol>{selected.steps.map((step) => <li key={step}>{step}</li>)}</ol><div className="emergency-contact"><strong>Contact the FarmDirect quality desk</strong><span>Share photos, crop name, location, and order number.</span><div className="support-actions"><a className="whatsapp-cta" href={whatsappLink('+919876543210', selected.contact)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp now</a><a className="support-icon-link" href="tel:+919876543210" title="Call emergency farm support" aria-label="Call emergency farm support"><Phone size={16} /></a></div></div></div></section></div>}</>;
}

function WhatsAppSupport() {
  return <a className="whatsapp-support" href={whatsappLink(WHATSAPP_HELP_LINE, 'Hello, I am a farmer and need help with Farmers A to Z.')} target="_blank" rel="noreferrer" title="Chat with Farmers A to Z on WhatsApp"><MessageCircle size={18} /><span>WhatsApp help</span></a>;
}

createRoot(document.getElementById('root')).render(<><LanguageProvider><App /></LanguageProvider><CropEmergency /><WhatsAppSupport /></>);