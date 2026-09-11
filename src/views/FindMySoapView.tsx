import React, { useState } from 'react';
import { ViewState, SoapProduct } from '../types';
import { SOAPS_DATA } from '../data/soaps';

interface FindMySoapViewProps {
  setCurrentView: (view: ViewState) => void;
  setSelectedSoap: (soap: SoapProduct) => void;
  addToCart: (soap: SoapProduct) => void;
  products?: SoapProduct[];
}

export const FindMySoapView: React.FC<FindMySoapViewProps> = ({ setCurrentView, setSelectedSoap, addToCart, products = SOAPS_DATA }) => {
  const [step, setStep] = useState(1);
  const [skinType, setSkinType] = useState('Oily');
  const [primaryGoal, setPrimaryGoal] = useState('Excess oil');
  const [treatment, setTreatment] = useState('No');
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const rules = [
    { skinType: 'Oily', primaryNeed: 'Excess Oil', recommendedSoap: 'Prakriti Neem Soap' },
    { skinType: 'Dry', primaryNeed: 'Nourishment', recommendedSoap: 'Raw Sandalwood & Kesar' },
    { skinType: 'Sensitive', primaryNeed: 'Calming', recommendedSoap: 'Calming Aloe & Honey' },
  ];

  const matchingRule = rules.find(r => r.skinType.toLowerCase() === skinType.toLowerCase()) || rules[0];
  const targetSoapName = matchingRule ? matchingRule.recommendedSoap : 'Prakriti Neem Soap';

  const recommendedSoap = products.find(p => p.name.toLowerCase().includes(targetSoapName.toLowerCase())) || 
    products.find(s => {
      if (skinType === 'Dry') return s.id.includes('sandalwood') || s.id.includes('aloe');
      if (skinType === 'Sensitive') return s.id.includes('aloe');
      return s.id.includes('neem');
    }) || products[0];

  const handleAddRec = () => {
    if (recommendedSoap.stockStatus === 'Out of Stock') return;
    addToCart(recommendedSoap);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Top Botanical Ambience Accent */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#4c6455] animate-pulse"></span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#4c6455]">Ayurvedic Skin Diagnostic</span>
        </div>
        <span className="text-xs font-semibold text-[#424843]/80 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px] text-[#ffdcbd]">verified</span>
          100% Herbal Wisdom
        </span>
      </div>

      {/* Header Section */}
      <section className="px-4 flex flex-col gap-2 mb-4">
        <h1 className="font-['Playfair_Display'] text-[30px] font-semibold text-[#072417] leading-tight">
          Not Sure Which Soap Is Right for You?
        </h1>
        <p className="text-sm text-[#424843]">
          Tell us a little about your skin and we'll recommend your handcrafted ritual.
        </p>

        {/* Interactive Progress Indicator */}
        <div className="mt-2 p-3 rounded-xl bg-[#efeeeb] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#072417] font-bold">Step {step} of 3</span>
            <span className="text-[#4c6455]">Prakriti Analysis</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#e4e2df] overflow-hidden">
            <div 
              className="h-full bg-[#072417] rounded-full transition-all duration-300" 
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      </section>

      {/* Multi-Step Interactive Form Box */}
      <section className="px-4 mb-8">
        <div className="p-4 rounded-2xl bg-[#f5f3f0] shadow-[0_8px_24px_-4px_rgba(30,58,43,0.06)] flex flex-col gap-6">
          
          {/* STEP 1: SKIN TYPE */}
          {step === 1 && (
            <div className="flex flex-col gap-3 transition-opacity duration-200">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#4c6455] uppercase">Question 1</span>
                  <h2 className="font-['Playfair_Display'] text-xl font-semibold text-[#072417]">What is your skin type?</h2>
                </div>
                <span className="material-symbols-outlined text-[#4c6455]">water_drop</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['Oily', 'Dry', 'Normal', 'Combination', 'Sensitive', 'Not Sure'].map((type) => {
                  const selected = skinType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSkinType(type)}
                      className={`flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                        selected 
                          ? 'bg-[#cbe6d4] text-[#344c3e] font-bold shadow-sm' 
                          : 'bg-[#efeeeb] text-[#1b1c1a] hover:bg-[#e4e2df]'
                      }`}
                    >
                      <span className="text-sm font-semibold">{type}</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${selected ? 'bg-[#072417]' : 'bg-[#e4e2df]'}`}>
                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: MAIN GOAL */}
          {step === 2 && (
            <div className="flex flex-col gap-3 transition-opacity duration-200">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#4c6455] uppercase">Question 2</span>
                  <h2 className="font-['Playfair_Display'] text-xl font-semibold text-[#072417]">What are you mainly looking for?</h2>
                </div>
                <span className="material-symbols-outlined text-[#4c6455]">local_florist</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { val: 'Excess oil', label: 'Excess oil balance', icon: 'filter_vintage' },
                  { val: 'Daily cleansing', label: 'Daily cleansing', icon: 'clean_hands' },
                  { val: 'Fresh feeling', label: 'Fresh rejuvenating feeling', icon: 'air' },
                  { val: 'Dryness care', label: 'Dryness care & hydration', icon: 'spa' },
                  { val: 'Acne-prone skin care', label: 'Acne-prone skin care', icon: 'healing' },
                  { val: 'Natural skincare', label: '100% Pure Natural skincare', icon: 'eco' },
                ].map((item) => {
                  const selected = primaryGoal === item.val;
                  return (
                    <button
                      key={item.val}
                      onClick={() => setPrimaryGoal(item.val)}
                      className={`flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                        selected 
                          ? 'bg-[#cbe6d4] text-[#344c3e] font-bold shadow-sm' 
                          : 'bg-[#efeeeb] text-[#1b1c1a] hover:bg-[#e4e2df]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`material-symbols-outlined text-[18px] ${selected ? 'text-[#072417]' : 'text-[#4c6455]'}`}>
                          {item.icon}
                        </span>
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${selected ? 'bg-[#072417]' : 'bg-[#e4e2df]'}`}>
                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: TREATMENT */}
          {step === 3 && (
            <div className="flex flex-col gap-3 transition-opacity duration-200">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#4c6455] uppercase">Question 3</span>
                  <h2 className="font-['Playfair_Display'] text-xl font-semibold text-[#072417]">Are you currently using any skin treatment?</h2>
                </div>
                <span className="material-symbols-outlined text-[#4c6455]">medical_services</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['No', 'Yes', 'Not Sure'].map((opt) => {
                  const selected = treatment === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setTreatment(opt)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl text-center transition-all ${
                        selected 
                          ? 'bg-[#cbe6d4] text-[#344c3e] font-bold shadow-sm' 
                          : 'bg-[#efeeeb] text-[#1b1c1a] hover:bg-[#e4e2df]'
                      }`}
                    >
                      <span className="text-sm font-semibold">{opt}</span>
                      <span className={`w-3.5 h-3.5 rounded-full mt-1 flex items-center justify-center ${selected ? 'bg-[#072417]' : 'bg-[#e4e2df]'}`}>
                        {selected && <span className="w-1 h-1 rounded-full bg-white"></span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation / Trigger Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#efeeeb] text-[#1b1c1a] font-semibold text-sm text-center hover:bg-[#e4e2df] transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back</span>
              </button>
            )}

            {step < 3 ? (
              <button 
                onClick={() => setStep(step + 1)}
                className="flex-[2] py-3 px-4 rounded-xl bg-[#072417] text-white font-semibold text-sm text-center shadow-md hover:bg-[#1e3a2b] transition-all flex items-center justify-center gap-1.5"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button 
                onClick={() => setShowRecommendation(true)}
                className="flex-[2] py-3.5 px-4 rounded-xl bg-[#072417] text-white font-semibold text-sm text-center shadow-md hover:bg-[#1e3a2b] transition-all flex items-center justify-center gap-1.5"
              >
                <span>See My Recommendation</span>
                <span>🌿</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Live Animated Divider Leaf Accent */}
      {showRecommendation && (
        <>
          <div className="px-4 flex items-center justify-center gap-3 my-2">
            <div className="h-px bg-[#e4e2df] flex-1"></div>
            <div className="flex items-center gap-1 text-[#4c6455] font-bold text-[11px] tracking-widest uppercase bg-[#efeeeb] px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[14px]">spa</span>
              <span>Handcrafted Botanical Match</span>
            </div>
            <div className="h-px bg-[#e4e2df] flex-1"></div>
          </div>

          {/* RECOMMENDATION RESULT PANEL */}
          <section className="px-4 mt-2 mb-8">
            <div className="relative overflow-hidden rounded-2xl bg-[#f5f3f0] shadow-[0_12px_32px_-4px_rgba(30,58,43,0.12)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#1e3a2b]/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="p-5 flex flex-col gap-4 relative">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#cee9d6] text-[#082014] text-[11px] tracking-wider uppercase font-bold">
                    <span>🌿</span> Recommended for You
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#ffdcbd] text-[#2c1600] font-semibold">
                    Dosha Balanced
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="font-['Playfair_Display'] text-xl font-semibold text-[#072417] tracking-tight">
                    {recommendedSoap.name.toUpperCase()}
                  </h3>
                  <p className="text-xs text-[#424843] leading-relaxed">
                    Based on your {skinType.toLowerCase()} skin profile and focus on {primaryGoal.toLowerCase()}, this handcrafted ritual with cold-pressed oils is thoughtfully curated for your balance.
                  </p>
                </div>

                <div 
                  onClick={() => { setSelectedSoap(recommendedSoap); setCurrentView('product-detail'); }}
                  className="rounded-xl overflow-hidden bg-[#efeeeb] p-2 flex flex-col gap-2 cursor-pointer group"
                >
                  <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#e4e2df] flex items-center justify-center">
                    <img 
                      alt={recommendedSoap.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      src={recommendedSoap.image} 
                    />
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
                      <span className="text-[10px] text-[#072417] font-bold tracking-widest uppercase">Cold-Pressed Herbal Blend</span>
                    </div>
                    <div className="absolute top-2 right-2 bg-[#072417] text-white px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider">
                      100% Pure
                    </div>
                  </div>

                  <div className="p-1 flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="font-['Playfair_Display'] text-lg font-bold text-[#072417]">₹{recommendedSoap.price}</span>
                      <span className="text-xs text-[#424843]">/ {recommendedSoap.weight || '100g Bar'}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      recommendedSoap.stockStatus === 'In Stock' ? 'bg-[#cbe6d4] text-[#072417]' :
                      recommendedSoap.stockStatus === 'Only 3 left' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {recommendedSoap.stockStatus || 'In Stock'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[#4c6455] uppercase tracking-widest">Botanical Benefits</span>
                  {recommendedSoap.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#efeeeb] text-[#424843] text-xs">
                      <span className="material-symbols-outlined text-[#072417] text-[18px]">check_circle</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-[#efeeeb] flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#4c6455] text-[18px] mt-0.5">info</span>
                  <p className="text-xs text-[#424843] leading-snug">
                    <strong className="font-semibold text-[#072417]">Ayurvedic Skincare Note:</strong> Safe skincare recommendation based on traditional botanical ingredients. Not a medical treatment.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <button 
                    onClick={handleAddRec}
                    disabled={recommendedSoap.stockStatus === 'Out of Stock'}
                    className={`w-full py-3.5 px-4 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_-4px_rgba(7,36,23,0.25)] transition-all ${
                      recommendedSoap.stockStatus === 'Out of Stock' 
                        ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                        : 'bg-[#072417] hover:bg-[#1e3a2b]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                    <span>{recommendedSoap.stockStatus === 'Out of Stock' ? 'Out of Stock' : (addedToast ? 'Added to Bag!' : `Add to Bag (₹${recommendedSoap.price})`)}</span>
                  </button>

                  <a 
                    className="w-full py-3 px-4 rounded-xl bg-[#4c6455] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#4c6455]/90 transition-colors text-center"
                    href={`https://wa.me/919579408654?text=Hello%20PRAKRITI,%20I%20completed%20the%20skin%20quiz%20and%20was%20recommended%20the%20${encodeURIComponent(recommendedSoap.name)}%20(100g).`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>Order Instantly on WhatsApp</span>
                  </a>

                  <button 
                    onClick={() => { setShowRecommendation(false); setStep(1); }}
                    className="w-full py-2.5 text-center text-xs font-bold text-[#4c6455] hover:text-[#072417] transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                    <span>Retake Skin Quiz</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
