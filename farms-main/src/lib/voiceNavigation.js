const navigationPatterns = [
  { target: 'orders', label: 'Opening your orders.', regex: /(orders?|ऑर्डर|ऑर्डर्स|ఆర్డర్|ఆర్డర్స్|ஆர்டர்|ಆರ್ಡರ್‌ಗಳು|ಆರ್ಡರುಗಳು|ഓർഡർ|ऑर्डर्स|order list|my orders|my order|order page|show orders|show my orders)/i },
  { target: 'reviews', label: 'Opening reviews.', regex: /(reviews?|रेटिंग|समीक्षा|సమీక్ష|விமர்சனம்|ವಿಮರ್ಶೆ|അവലോകനം|feedback|ratings|show reviews)/i },
  { target: 'inputs', label: 'Opening farm inputs.', regex: /(inputs?|farm inputs|fertilizer|seed|agri|supply|खाद|बीज|सामग्री|విత్తనాలు|ఎరువులు|క్రిమి?నాశనం|ఇన్‌పుట్|ఇన్‌పుట్‌లు|పంట|సామగ్రి|சாமான்கள்|பொருட்கள்|சந்தை பொருட்கள்|farm supplies|show inputs)/i },
  { target: 'machinery', label: 'Opening machinery sharing.', regex: /(machin(ery|e)|tractor|harvester|sprayer|tractor rental|equipment|యంత్రం|మిషన్ యంత్రాలు|கழிவுப்|யந்திரம்|യന്ത്രം|मशीन|ट्रैक्टर|हैवी मशीन|त्रैक्टर|show machinery)/i },
  { target: 'retail-connect', label: 'Opening retail connect.', regex: /(retail|retail connect|shop connect|खुदरा|రిటైల్|சில்லறை|ಚಿಲ್ಲರೆ|റീട്ടെയിൽ|retailer|show retail)/i },
  { target: 'calculator', label: 'Opening the savings calculator.', regex: /(calculator|calculate|saving|savings|कैलकुलेटर|लागत|లెక్క|గణన|கணக்கீடு|ಕ್ಯಾಲ್ಕುಲೇಟರ್|ಸೇವಿಂಗ್|ಸೇವಿಂಗ್ಸ್|profit|show calculator|zero cut)/i },
  { target: 'radar', label: 'Opening demand radar.', regex: /(demand radar|radar|market demand|demand|मांग|डिमांड|డిమాండ్|தேவை|ಬೇಡಿಕೆ|ഡിമാൻഡ്|show demand|price trend|market signal)/i },
  { target: 'nearby-markets', label: 'Opening nearby markets.', regex: /(nearby market|nearby markets|market near me|local market|mandi|bazar|बाजार|बाज़ार|మార్కెట్|చుట్టుపక్కల మార్కెట్|சந்தை|ಮಾರುಕಟ್ಟೆ|വിപണി|show local markets|find markets|nearby)/i },
  { target: 'market', label: 'Opening marketplace.', regex: /(marketplace|shop|home|open market|buy produce|buy items|खरीद|మార్కెట్|విపణి|market|shopping|show marketplace)/i },
  { target: 'farmer', label: 'Opening the farmer hub.', regex: /(farmer hub|farmer|কৃষক|కిషన్|రైతు|விவசாயி|ರೈತ|കർഷക|किसान|show farmer|go to farmer|farmer center|farm hub)/i },
  { target: 'add-listing', label: 'Opening the produce listing form.', regex: /(add produce|add listing|list item|new listing|add crop|जोड़ें|జోడించు|சேர்க்க|ಸೇರಿಸಿ|വിള ചേർക്ക|add a product|post produce|sell produce|sell crop)/i }
];

const farmerNeedPatterns = [
  { key: 'I need a farming loan', regex: /(loan|credit|kcc|money|finance|ऋण|लोन|कर्ज|పెట్టుబడి|రుణం|లోన్|கடன்|പണപൂർവ്വം|വായ്പ|ಸಾಲ|ಹಣ|പണം|finance)/i },
  { key: 'I need crop insurance', regex: /(insurance|crop damage|claim|compensation|बीमा|फसल बीमा|नुकसान|मुआवजा|భీమా|పంట నష్టం|పరిహారం|காப்பீடு|பயிர் சேதம்|இழப்பீடு|ವಿಮೆ|ಬೆಳೆ ಹಾನಿ|ಪರಿಹಾರ|ഇൻഷുറൻസ്|വിള നാശം|നഷ്ടപരിഹാരം)/i },
  { key: 'I want to check my PM-KISAN status', regex: /(pm.?kisan|beneficiary|e.?kyc|किसान सम्मान|पीएम किसान|పీఎం కిసాన్|பிஎம் கிசான்|పಿಎಂ ಕಿಸಾನ್|പിഎംകിസാൻ|PM-KISAN|pm kisan|check kisan)/i },
  { key: 'I want to sell my crops', regex: /(sell|selling|buyer|mandi|e.?nam|market price|crop price|बेचना|बिक्री|खरीदार|मंडी|बाजार भाव|అమ్మాలి|విక్రయం|విక్రయించు|விற்க|வாங்குபவர்|சந்தை விலை|ಮಾರಾಟ|ಖರೀದಿದಾರ|മാർക്കറ്റ് വില|വിൽക്ക|വാങ്ങുന്നയാൾ|പണം കിട്ടും|പണമായ്|বিক্রি|ফসল|চাই)/i },
  { key: 'I need soil testing information', regex: /(soil|soil test|fertilizer|manure|मिट्टी|मृदा परीक्षण|खाद|उर्वरक|నేల పరీక్ష|ఎరువు|మన్ను|മண் பரிசோதனை|உரம்|மண்ணின் பரிசோதனை|ಗೊಬ್ಬರ|ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ|വളം|സെൽറ്റ്)/i },
  { key: 'I need Telangana agriculture services', regex: /(telangana|తెలంగాణ|तेलंगाना|தெலங்கானா|ತೆಲಂಗಾಣ|തെലങ്കാന|telangana agriculture|agri services)/i }
];

export function findNavigationTarget(transcript = '') {
  const text = (transcript || '').trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  for (const pattern of navigationPatterns) {
    if (pattern.regex.test(text)) {
      return { target: pattern.target, label: pattern.label };
    }
  }
  if (/(help|मदद|సహాయం|உதவி|ಸಹಾಯ|സഹായം)/i.test(text)) {
    return { target: 'market', label: 'Say marketplace, orders, reviews, inputs, nearby markets, machinery, demand radar, calculator, retail, farmer hub, or add produce.' };
  }
  if (/(marketplace|मैरकेटप्लेस|మార్కెట్‌ప్లేస్|சந்தை பக்கம்|ಮಾರುಕಟ್ಟೆ)/i.test(normalized)) {
    return { target: 'market', label: 'Opening marketplace.' };
  }
  return null;
}

export function detectFarmerNeed(transcript = '') {
  const text = (transcript || '').trim();
  if (!text) return '';
  const match = farmerNeedPatterns.find((entry) => entry.regex.test(text));
  return match ? match.key : '';
}
