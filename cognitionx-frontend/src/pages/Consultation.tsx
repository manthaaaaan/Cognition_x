import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Loader2, ClipboardList, CheckCircle2, AlertCircle, ArrowRight, Activity, ChevronDown, UserPlus, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, Pill, Languages, Volume2, MessageSquare, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  // Metadata extraction
  patient_name?: string | null;
  patient_age?: string | null;
  patient_sex?: string | null;
  vitals_string?: string | null;
  // Agent analysis fields
  drug_interaction_risk?: string;
  interaction_details?: string;
  alternative_medications?: string[];
  icd10_validation?: string;
  icd10_notes?: string;
}

interface Translation {
  role: 'patient' | 'doctor';
  text: string;
  originalText?: string;
  timestamp: Date;
}

const MOCK_PATIENTS = [
  {
    id: 1,
    name: "Ravi Kumar (Kannada)",
    ageSex: "34 / Male",
    complaint: "Fever & Body Pain",
    diagnosis: "Acute Viral Fever",
    soap: {
      subjective: "34yr male, fever for 3 days, severe body pain, no appetite. No cough or travel history.",
      objective: "Temp: 102.4°F, BP: 118/76, HR: 92 bpm. Throat mildly congested.",
      assessment: "Acute Viral Febrile Illness. ICD-10: R50.9",
      plan: "1. Tab. Paracetamol 650mg (1-1-1) 5 days\n2. Tab. Cetirizine 10mg (0-0-1) 3 days\n3. ORS, complete bed rest, plenty of fluids.",
      patient_name: "Ravi Kumar",
      patient_age: "34",
      patient_sex: "Male",
      vitals_string: "Temp 102.4°F, BP 118/76, HR 92bpm",
      drug_interaction_risk: "SAFE",
      interaction_details: "No known interactions between Paracetamol and Cetirizine.",
      icd10_validation: "VALID",
      icd10_notes: "R50.9 — Fever unspecified. Correct code for acute viral fever without identified pathogen."
    },
    conversation: [
      { role: "patient", text: "Doctor, naange 3 dina ಆಯ್ತು jwara iddhe, temperature 102 iddhe, maikke ella novu" },
      { role: "doctor", text: "Age eshtu? Cough or cold ide?" },
      { role: "patient", text: "34 years, cough illa, body ella pain aagtiddhe, food kuda tinnalike aagutilla" },
      { role: "doctor", text: "BP 118/76 ide, throat congested iddhe. Paracetamol 650mg 3 times, Cetirizine night takkoli, rest maadi" }
    ]
  },
  {
    id: 2,
    name: "Kavitha Nair (Kannada)",
    ageSex: "52 / Female",
    complaint: "High BP & Chest Heaviness",
    diagnosis: "Hypertension Stage 2",
    soap: {
      subjective: "52yr female, persistent headache, chest heaviness since morning. Known hypertensive, missed medication 2 days.",
      objective: "BP: 168/102, Temp: 98.6°F, HR: 96 bpm, SpO2: 97%.",
      assessment: "Hypertension Stage 2, uncontrolled. ICD-10: I10",
      plan: "1. Tab. Amlodipine 10mg (1-0-0) daily\n2. Tab. Telmisartan 40mg (1-0-0) morning\n3. Low sodium diet, no stress, BP check every 48hrs.",
      patient_name: "Kavitha Nair",
      patient_age: "52",
      patient_sex: "Female",
      vitals_string: "BP 168/102, Temp 98.6°F, SpO2 97%",
      drug_interaction_risk: "MODERATE",
      interaction_details: "Amlodipine + Telmisartan combination may cause peripheral edema in some patients. Monitor closely.",
      alternative_medications: [
        "Losartan 50mg (instead of Telmisartan, less edema risk)",
        "Indapamide 1.5mg (gentler diuretic option)"
      ],
      icd10_validation: "VALID",
      icd10_notes: "I10 — Essential hypertension. Correct for uncontrolled primary hypertension."
    },
    conversation: [
      { role: "patient", text: "Doctor, nanna tala thumba novu iddhe, chestalli heavy feel aagtiddhe, belegeeninda" },
      { role: "doctor", text: "BP tablets tegoluttiddeera? Last 2 days medicine tegedira?" },
      { role: "patient", text: "Illa doctor, maredbitten, 52 years aaytu naange, munche kuda BP problem itthu" },
      { role: "doctor", text: "BP 168/102 iddhe, tumbaa jaasthi. Amlodipine 10mg morning, Telmisartan 40mg kuda start maadi, uppu kam maadi" }
    ]
  },
  {
    id: 3,
    name: "Aman Verma (Hindi)",
    ageSex: "45 / Male",
    complaint: "High Sugar Level (280 mg/dL)",
    diagnosis: "Uncontrolled Type 2 Diabetes",
    soap: {
      subjective: "45yr male, sugar level 280 mg/dL, on Metformin 500mg for 2 years, no improvement. Complains of frequent urination and fatigue.",
      objective: "Blood Sugar (RBS): 280 mg/dL, BP: 132/84, Temp: 98.4°F, Weight: 84kg.",
      assessment: "Uncontrolled Type 2 Diabetes Mellitus. ICD-10: E11.9",
      plan: "1. Increase Metformin to 1000mg twice daily\n2. Add Tab. Glimepiride 1mg before breakfast\n3. Strict diabetic diet, sugar check every 72hrs.",
      patient_name: "Aman Verma",
      patient_age: "45",
      patient_sex: "Male",
      vitals_string: "Sugar 280mg/dL, BP 132/84, Temp 98.4°F",
      drug_interaction_risk: "MODERATE",
      interaction_details: "Metformin + Glimepiride combination can cause hypoglycemia. Patient should monitor sugar levels closely.",
      alternative_medications: [
        "Sitagliptin 50mg (lower hypoglycemia risk)",
        "Vildagliptin 50mg (safer with Metformin)",
        "Empagliflozin 10mg (also aids weight loss)"
      ],
      icd10_validation: "VALID",
      icd10_notes: "E11.9 — Type 2 diabetes mellitus without complications. Correct for uncontrolled DM2."
    },
    conversation: [
      { role: "patient", text: "Doctor saab, sugar level bahut zyada ho raha hai, 280 aaya last test mein, 45 saal ka hoon", translated: "Doctor, my sugar level is getting very high, it was 280 in the last test, I am 45 years old." },
      { role: "doctor", text: "Kab se hai? Koi medication chal rahi hai abhi? Temperature theek hai?", translated: "Since when? Are you on any medication? Is your temperature okay?" },
      { role: "patient", text: "2 saal se hai, Metformin 500 le raha hoon but koi farak nahi, thakaan bahut rehti hai", translated: "It has been 2 years, I am taking Metformin 500 but no difference, I feel very fatigued." },
      { role: "doctor", text: "BP 132/84 hai, sugar 280 bahut zyada hai. Metformin 1000mg karo, Glimepiride bhi add karta hoon, diet strict rakho", translated: "BP is 132/84, sugar 280 is too high. Increase Metformin to 1000mg, adding Glimepiride too, keep diet strict." }
    ]
  },
  {
    id: 4,
    name: "Meera Devi (Hindi)",
    ageSex: "26 / Female",
    complaint: "Weakness & Dizziness (6mo Pregnant)",
    diagnosis: "Gestational Anemia",
    soap: {
      subjective: "26yr female, 6 months pregnant, severe weakness and dizziness, taking iron tablets. Hemoglobin 9.5 g/dL last month.",
      objective: "Hb: 9.5 g/dL, BP: 110/70, Temp: 98.2°F, HR: 88 bpm. Clinical pallor present.",
      assessment: "Gestational Anemia (Hb 9.5 g/dL). ICD-10: D64.9",
      plan: "1. Double iron tablet dose — Ferrous Sulfate 200mg twice daily\n2. Add Folic Acid 5mg daily\n3. Spinach, jaggery, protein-rich diet. Mandatory bed rest.",
      patient_name: "Meera Devi",
      patient_age: "26",
      patient_sex: "Female",
      vitals_string: "Hb 9.5g/dL, BP 110/70, Temp 98.2°F",
      drug_interaction_risk: "SAFE",
      interaction_details: "Ferrous Sulfate and Folic Acid combination is standard and safe for gestational anemia.",
      icd10_validation: "VALID",
      icd10_notes: "D64.9 — Anemia unspecified. Appropriate for gestational anemia with Hb below 10."
    },
    conversation: [
      { role: "patient", text: "Doctor, 6 month pregnant hoon, 26 saal ki hoon, bahut weakness hai, chakkar bhi aata hai", translated: "Doctor, I am 6 months pregnant, I am 26 years old, I feel very weak, I also feel dizzy." },
      { role: "doctor", text: "Temperature kitna hai? Hemoglobin check kiya era? Iron tablets le rahi ho?", translated: "What is your temperature? Did you check Hemoglobin? Are you taking iron tablets?" },
      { role: "patient", text: "Temp normal tha, 1 mahine pehle Hb 9.5 tha, iron tablets le rahi hoon but chakkar nahi ruk raha", translated: "Temperature was normal, Hb was 9.5 a month ago, taking iron tablets but dizziness is not stopping." },
      { role: "doctor", text: "BP 110/70 hai, Hb bahut kam hai. Iron dose double karo, Folic Acid bhi lo, rest zaroor karo, spinach aur gud khao", translated: "BP is 110/70, Hb is very low. Double the iron dose, take Folic Acid too, rest is mandatory, eat spinach and jaggery." }
    ]
  }
];

const Consultation: React.FC = () => {
  const doctorName = localStorage.getItem('doctor_name') || 'Doctor';
  const role = (localStorage.getItem('user_role') || 'doctor') as 'doctor' | 'asha';

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showMockMenu, setShowMockMenu] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>('Auto');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'field' | 'feed'>(role === 'asha' ? 'current' : 'feed');
  const [fieldReports, setFieldReports] = useState<any[]>([]);

  const [riskyMeds, setRiskyMeds] = useState<string[]>([]);
  const [swappedMeds, setSwappedMeds] = useState<Record<string, string>>({});
  const [swappingMed, setSwappingMed] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate();


  useEffect(() => {
    if (role === 'doctor' && activeTab === 'field') {
      fetchFieldReports();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [role, activeTab]);

  const fetchFieldReports = async () => {
    try {
      const response = await axios.get('https://cognitionx-production.up.railway.app/api/consultation/field-reports');
      setFieldReports(response.data);
    } catch (err) {
      console.error('Error fetching field reports:', err);
    }
  };

  useEffect(() => {
    if (soapNote && Object.keys(swappedMeds).length === 0) {
      const match = soapNote.interaction_details?.match(/(.*?)\s+combination/i);
      if (match) {
        setRiskyMeds(match[1].split('+').map((s: string) => s.trim()));
      } else {
        setRiskyMeds([]);
      }
    }
  }, [soapNote, swappedMeds]);

  const startRecording = async () => {
    setIsDemoMode(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      timerRef.current = window.setInterval(() => {
        // Timer running
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access denied. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleMockSelect = (mock: any) => {
    setShowMockMenu(false);
    setIsProcessing(false); // keep false to show feed
    setSoapNote(null);
    setSwappedMeds({});
    setRiskyMeds([]);
    setError(null);
    setTranslations([]); // Clear feed

    // Simulate turns one by one
    if (mock.conversation) {
      mock.conversation.forEach((turn: any, index: number) => {
        setTimeout(() => {
          setTranslations(prev => [...prev, {
            role: turn.role as any,
            text: turn.translated || turn.text, // Show translated if available
            originalText: turn.translated ? turn.text : undefined,
            timestamp: new Date()
          }]);

          // Final summarization phase
          if (index === mock.conversation.length - 1) {
            setTimeout(() => {
              setIsProcessing(true); // Now show "Summarizing..."
              setTimeout(() => {
                setIsProcessing(false);
                setIsDemoMode(true);
                setSoapNote(mock.soap);
                localStorage.setItem('last_soap_note', JSON.stringify(mock.soap));
              }, 1200);
            }, 1000);
          }
        }, index * 800);
      });
    } else {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setIsDemoMode(true);
        setSoapNote(mock.soap);
      }, 1500);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setSoapNote(null);
    setSwappedMeds({});
    setRiskyMeds([]);
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'consultation.wav');
    formData.append('language_hint', selectedLanguage || 'Auto');

    try {
      const response = await axios.post('https://cognitionx-production.up.railway.app/api/consultation/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSoapNote(response.data);
      localStorage.setItem('last_soap_note', JSON.stringify(response.data));
    } catch (err) {
      console.error('Error processing audio:', err);

      if (axios.isAxiosError(err)) {
        if (!err.response) {
          // Network error or server unreachable
          setError('Backend server is unavailable. Please check your connection.');
        } else if (err.response.status === 500) {
          const detail = err.response.data?.detail?.toLowerCase() || '';
          if (detail.includes('no speech') || detail.includes('empty transcript') || detail.includes('no transcript')) {
            setError('No audio detected. Please speak clearly during the consultation and try again.');
          } else {
            setError('Processing failed. Please try again.');
          }
        } else {
          setError('Processing failed. Please try again.');
        }
      } else {
        setError('Processing failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToDoctor = async () => {
    if (!soapNote) return;
    setIsProcessing(true);

    // Get GPS location
    let location = "Unknown";
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      location = `${pos.coords.latitude}, ${pos.coords.longitude}`;
    } catch (err) {
      console.warn("Location access denied");
    }

    try {
      await axios.post('https://cognitionx-production.up.railway.app/api/consultation/field-report', {
        asha_name: doctorName,
        asha_id: localStorage.getItem('medical_id'),
        patient_name: soapNote.patient_name || "Unknown",
        summary: soapNote,
        location: location,
        urgency: soapNote.drug_interaction_risk || "MEDIUM" // Using safety risk as proxy for urgency
      });
      alert("Report sent to doctor's review queue!");
      navigate('/dashboard');
    } catch (err) {
      console.error('Error sending report:', err);
      setError('Failed to send report. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwap = (originalMed: string, alternative: string) => {
    if (!soapNote) return;
    const newMedName = alternative.split(' ')[0];
    
    setSoapNote({
      ...soapNote,
      plan: soapNote.plan.replace(new RegExp(originalMed, 'gi'), newMedName),
      drug_interaction_risk: "SAFE",
      interaction_details: "Prescription updated with safer alternative by doctor."
    });
    setSwappedMeds(prev => ({ ...prev, [originalMed]: alternative }));
    setSwappingMed(null);
  };

  const languages = [
    { name: 'Kannada', local: 'ಕನ್ನಡ', flag: '' },
    { name: 'Hindi', local: 'हिंदी', flag: '' },
    { name: 'Tamil', local: 'தமிழ்', flag: '' },
    { name: 'English', local: 'English', flag: '' }
  ];


  return (
    <div className="min-h-screen bg-clinical-navy p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-clinical-white">
                {role === 'asha' ? 'Community Health Visit' : 'Consultation Room'}
              </h1>
              <p className="text-clinical-text-secondary">
                {role === 'asha' ? 'Worker' : 'Doctor'}: <span className="text-clinical-accent">{doctorName}</span>
              </p>
            </div>
            {isDemoMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-clinical-accent/10 border border-clinical-accent/30 text-clinical-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              >
                <div className="w-2 h-2 bg-clinical-accent rounded-full animate-pulse" />
                Demo Mode
              </motion.div>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-clinical-text-secondary hover:text-clinical-white transition-colors text-sm"
            >
              Log Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Recording Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card-clinical flex flex-col items-center justify-center py-12 text-center border-dashed border-2 border-clinical-accent/20 relative">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 scale-110 ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-clinical-accent/20'}`}>
                {isRecording ? (
                  <div className="w-12 h-12 bg-red-500 rounded-lg animate-pulse" />
                ) : (
                  <Mic className="w-12 h-12 text-clinical-accent" />
                )}
              </div>

              <h2 className="text-xl font-semibold mb-2 text-clinical-white">
                {isRecording ? 'Recording Consultation...' : 'Ready to Start'}
              </h2>

              <p className="text-clinical-text-secondary mb-8 text-sm px-4">
                {isRecording
                  ? (role === 'asha' ? 'AI is listening...' : 'The AI is listening and capturing clinical data in real-time.')
                  : (role === 'asha' ? 'Press a button to start talking' : 'Start the recording or use a mock preset for demonstration.')}
              </p>

              {/* Single Recording Control */}
              <div className="flex flex-col gap-3 w-full px-6 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isProcessing}
                    className={`flex flex-col items-center gap-4 py-8 rounded-3xl border-2 transition-all bg-clinical-accent/10 border-clinical-accent/30 text-clinical-accent hover:bg-clinical-accent/20 hover:scale-105 active:scale-95 shadow-xl shadow-clinical-accent/10 group`}
                  >
                    <Mic className="w-12 h-12 group-hover:animate-pulse transition-all" />
                    <span className="text-lg font-black uppercase tracking-tight">Start Consultation</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex flex-col items-center gap-4 py-8 rounded-3xl border-2 border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:scale-105 active:scale-95 shadow-xl shadow-red-500/10 animate-pulse"
                  >
                    <Square className="w-12 h-12" />
                    <span className="text-lg font-black uppercase tracking-tight">Stop & Analyze</span>
                  </button>
                )}
              </div>

              {/* Language Hint Dropdown */}
              <div className="w-full px-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase text-clinical-text-secondary tracking-widest flex items-center gap-1">
                    <Languages className="w-3 h-3 text-clinical-accent" />
                    Hint Language (Optional)
                  </label>
                  <span className="text-[9px] text-clinical-accent/60 font-bold italic uppercase">Auto-Detect ON</span>
                </div>
                <select
                  value={selectedLanguage || 'Auto'}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-clinical-blue/20 border border-clinical-accent/20 rounded-xl px-4 py-3 text-xs font-bold text-clinical-white focus:border-clinical-accent outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="Auto">Auto (Smart Detect)</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Malayalam">Malayalam</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 w-full px-6">
                {!isRecording && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMockMenu(!showMockMenu)}
                      disabled={isProcessing}
                      className="w-full bg-clinical-blue hover:bg-clinical-blue/70 text-clinical-white border border-clinical-accent/30 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-5 h-5 text-clinical-accent" />
                      Use Mock Patient
                      <ChevronDown className={`w-4 h-4 transition-transform ${showMockMenu ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showMockMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-10 bottom-full mb-2 left-0 right-0 bg-clinical-navy border border-clinical-accent/30 rounded-xl shadow-2xl p-2 space-y-1"
                        >
                          {MOCK_PATIENTS.map((mock) => (
                            <button
                              key={mock.id}
                              onClick={() => handleMockSelect(mock)}
                              className="w-full text-left p-4 rounded-xl hover:bg-clinical-accent/10 group transition-all duration-300 border border-transparent hover:border-clinical-accent/20"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-base text-clinical-white group-hover:text-clinical-accent transition-colors">
                                    {mock.name}
                                  </span>
                                  <Sparkles className="w-3 h-3 text-clinical-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="text-xs font-semibold text-clinical-text-secondary/80">
                                  {mock.ageSex}
                                </div>

                                <div className="text-[11px] text-clinical-text-secondary line-clamp-1 italic">
                                  "{mock.complaint}"
                                </div>

                                <div className="mt-2 text-[10px] inline-flex items-center px-2 py-0.5 rounded-full bg-clinical-accent/10 text-clinical-accent font-bold uppercase tracking-wider border border-clinical-accent/20 w-fit">
                                  {mock.diagnosis}
                                </div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {isProcessing && (
                <div className="mt-6 flex items-center gap-3 text-clinical-accent animate-pulse font-medium">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isDemoMode ? 'Loading Mock Data...' : 'AI Analyzing Audio...'}
                </div>
              )}

              {error && (
                <div className="mt-6 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="card-clinical p-4 bg-clinical-blue/50 border-none">
              <h3 className="text-xs font-bold uppercase tracking-widest text-clinical-text-secondary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-clinical-accent" />
                System Status
              </h3>
              <ul className="text-xs space-y-2 text-clinical-text-secondary">
                <li className="flex justify-between"><span>Gemini Audio API:</span> <span className="text-green-400">{isDemoMode ? 'Mock-Bypass' : 'Online'}</span></li>
                <li className="flex justify-between"><span>SOAP Pipeline:</span> <span className="text-green-400">Active</span></li>
                <li className="flex justify-between"><span>Demo Environment:</span> <span className={isDemoMode ? 'text-clinical-accent' : 'text-clinical-text-secondary/50'}>{isDemoMode ? 'Enabled' : 'Disabled'}</span></li>
              </ul>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {soapNote ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {role === 'doctor' && (
                    <div className="flex gap-4 mb-4">
                      <button
                        onClick={() => setActiveTab('current')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'current' ? 'bg-clinical-accent text-clinical-navy' : 'bg-clinical-white/5 text-clinical-text-secondary'}`}
                      >
                        Current Patient
                      </button>
                      <button
                        onClick={() => setActiveTab('field')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'field' ? 'bg-clinical-accent text-clinical-navy' : 'bg-clinical-white/5 text-clinical-text-secondary'}`}
                      >
                        Field Reports Queue
                      </button>
                      <button
                        onClick={() => setActiveTab('feed')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'feed' ? 'bg-clinical-accent text-clinical-navy' : 'bg-clinical-white/5 text-clinical-text-secondary'}`}
                      >
                        Translation Feed
                      </button>
                    </div>
                  )}

                  {activeTab === 'current' ? (
                    <>
                      <div className="flex justify-between items-center bg-clinical-blue p-6 rounded-xl border border-clinical-accent/30 mb-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-clinical-accent/20 p-3 rounded-lg">
                            <ClipboardList className="w-8 h-8 text-clinical-accent" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-clinical-white">
                              {role === 'asha' ? 'Visit Summary' : 'Generated SOAP Note'}
                            </h2>
                            <p className="text-sm text-clinical-text-secondary">
                              Created by AI from your conversation
                            </p>
                          </div>
                        </div>
                        {role === 'asha' ? (
                          <button
                            onClick={handleSendToDoctor}
                            className="bg-clinical-accent text-clinical-navy font-black py-4 px-10 rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-clinical-accent/20"
                          >
                            <ArrowRight className="w-6 h-6" />
                            SEND TO DOCTOR
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('/prescription')}
                            className="bg-clinical-white text-clinical-navy font-bold py-2 px-6 rounded-lg hover:bg-clinical-accent hover:text-clinical-navy transition-all flex items-center gap-2 group"
                          >
                            Next: Prescription
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Only show the 4 main SOAP fields in the view cards */}
                        {['subjective', 'objective', 'assessment', 'plan'].map((key, index) => {
                          const labels: any = {
                            subjective: role === 'asha' ? "Patient's Story" : "Subjective",
                            objective: role === 'asha' ? "Health Findings" : "Objective",
                            assessment: role === 'asha' ? "What it might be" : "Assessment",
                            plan: role === 'asha' ? "What to do next" : "Plan"
                          };
                          return (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="card-clinical relative overflow-hidden"
                            >
                              <div className="absolute top-0 left-0 w-1 h-full bg-clinical-accent"></div>
                              <h3 className="text-xs font-bold uppercase tracking-widest text-clinical-accent mb-3">{labels[key]}</h3>
                              <p className="text-clinical-white text-sm leading-relaxed whitespace-pre-wrap">{(soapNote as any)[key]}</p>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* AI Safety Audit Results */}
                      {soapNote.drug_interaction_risk && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 space-y-6"
                        >
                          <div className="flex items-center gap-2 text-clinical-accent mb-2">
                            <Activity className="w-5 h-5" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em]">Autonomous Safety Audit</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Drug Interaction Card */}
                            <div className="card-clinical bg-clinical-blue/30 border-clinical-accent/10 relative overflow-hidden">
                              <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-clinical-text-secondary">Drug Interaction Risk</h3>
                                {soapNote.drug_interaction_risk === 'SAFE' ? (
                                  <div className="bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> SAFE
                                  </div>
                                ) : soapNote.drug_interaction_risk === 'MODERATE' ? (
                                  <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> MODERATE RISK
                                  </div>
                                ) : (
                                  <div className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> HIGH RISK
                                  </div>
                                )}
                              </div>
                              <p className="text-clinical-white text-xs leading-relaxed italic">
                                {soapNote.interaction_details}
                              </p>
                            </div>

                            {/* ICD-10 Validation Card */}
                            <div className="card-clinical bg-clinical-blue/30 border-clinical-accent/10">
                              <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-clinical-text-secondary">ICD-10 Validation</h3>
                                {soapNote.icd10_validation === 'VALID' ? (
                                  <div className="text-green-400 text-[10px] font-black flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> VALIDATED
                                  </div>
                                ) : (
                                  <div className="text-red-400 text-[10px] font-black flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> CODE MISMATCH
                                  </div>
                                )}
                              </div>
                              <p className="text-clinical-white text-xs leading-relaxed">
                                {soapNote.icd10_notes}
                              </p>
                            </div>

                            {/* Alternative Medications (Conditional) */}
                            {soapNote.alternative_medications && soapNote.alternative_medications.length > 0 && (
                              <div className="md:col-span-2 card-clinical bg-clinical-accent/5 border-clinical-accent/20">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-clinical-accent mb-4 flex items-center gap-2">
                                  <Pill className="w-4 h-4" /> Recommended Safer Alternatives
                                </h3>
                                {riskyMeds.length > 0 ? (
                                  <div className="space-y-4">
                                    {riskyMeds.map(med => (
                                      <div key={med} className="flex flex-wrap items-center gap-3">
                                        <div className="bg-clinical-navy border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium text-clinical-white flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                          {med}
                                        </div>
                                        
                                        {swappedMeds[med] ? (
                                          <span className="text-green-400 text-xs font-bold flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                                            <CheckCircle2 className="w-4 h-4" /> Swapped
                                          </span>
                                        ) : (
                                          <div className="relative">
                                            <button 
                                              onClick={() => setSwappingMed(swappingMed === med ? null : med)}
                                              className="bg-clinical-accent/20 text-clinical-accent text-xs font-bold px-3 py-1.5 rounded hover:bg-clinical-accent/30 transition-colors flex items-center gap-1"
                                            >
                                              ⇄ Swap
                                            </button>
                                            
                                            {swappingMed === med && (
                                              <div className="absolute top-full left-0 mt-1 w-72 bg-clinical-navy border border-clinical-accent/30 rounded-lg shadow-xl z-20 p-1">
                                                {soapNote.alternative_medications?.map((alt, i) => (
                                                  <button
                                                    key={i}
                                                    onClick={() => handleSwap(med, alt)}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-clinical-accent/10 rounded text-clinical-white transition-colors"
                                                  >
                                                    {alt}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {soapNote.alternative_medications.map((med, i) => (
                                      <div key={i} className="bg-clinical-navy border border-clinical-accent/20 px-3 py-1.5 rounded-lg text-xs font-medium text-clinical-white flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-clinical-accent rounded-full" />
                                        {med}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </>
                  ) : activeTab === 'field' ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-clinical-accent" />
                        Pending Field Reviews
                      </h2>
                      {fieldReports.map((report, i) => (
                        <div key={i} className="card-clinical bg-clinical-white/5 border-clinical-accent/10 p-6 flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${report.urgency === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              <span className="text-sm font-bold">{report.patient_name}</span>
                              <span className="text-[10px] bg-clinical-accent/10 text-clinical-accent px-2 py-0.5 rounded uppercase font-black">{report.urgency}</span>
                            </div>
                            <p className="text-xs text-clinical-text-secondary">Sent by: {report.asha_name} • {report.location}</p>
                            <p className="text-sm italic text-clinical-white/80 mt-2">"{report.summary?.assessment}"</p>
                          </div>
                          <button
                            onClick={() => {
                              setSoapNote(report.summary);
                              setActiveTab('current');
                            }}
                            className="bg-clinical-accent/10 border border-clinical-accent hover:bg-clinical-accent hover:text-clinical-navy p-3 rounded-xl transition-all"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-clinical-blue/10 rounded-2xl border border-clinical-accent/5 overflow-hidden flex flex-col h-[600px]">
                      <div className="p-4 border-b border-clinical-accent/10 flex justify-between items-center bg-clinical-blue/20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-clinical-accent rounded-full animate-pulse" />
                          <h3 className="text-xs font-black uppercase tracking-widest text-clinical-white">A.I. Translation Feed (English Output)</h3>
                        </div>
                      </div>
                      <div className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-clinical-accent/20 bg-clinical-navy/30">
                        {translations.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                            <MessageSquare className="w-12 h-12 mb-4" />
                            <p className="text-sm">Speak or Select Mock Patient to see translations</p>
                          </div>
                        ) : (
                          translations.map((t, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${t.role === 'doctor' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[85%] p-4 rounded-2xl ${t.role === 'doctor' ? 'bg-clinical-accent text-clinical-navy rounded-tr-none' : 'bg-clinical-blue border border-clinical-accent/20 text-clinical-white rounded-tl-none'}`}>
                                <div className="flex items-center gap-2 mb-2 border-b border-black/5 pb-1">
                                  <span className="text-[10px] font-black uppercase tracking-tighter">{t.role === 'doctor' ? 'Clinical Assessment' : 'Patient Complaint'}</span>
                                  {t.role === 'doctor' && <ShieldCheck className="w-3 h-3" />}
                                </div>
                                {t.originalText && (
                                  <p className="text-[11px] leading-relaxed italic opacity-70 mb-2 border-l-2 border-black/10 pl-2">
                                    "{t.originalText}"
                                  </p>
                                )}
                                <p className="text-sm leading-relaxed font-medium">{t.text}</p>
                                <div className="mt-3 flex items-center justify-between opacity-40">
                                  <span className="text-[9px] font-bold italic uppercase">
                                    {t.originalText ? 'Translated to English' : 'Captured in English'}
                                  </span>
                                  <span className="text-[8px]">{new Date(t.timestamp).toLocaleTimeString()}</span>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : isProcessing ? (
                <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-clinical-accent/20 border-t-clinical-accent rounded-full animate-spin"></div>
                    <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-clinical-accent" />
                  </div>
                  <h2 className="text-xl font-semibold text-clinical-white">{isDemoMode ? 'Retrieving Preset...' : 'Summarizing Consultation...'}</h2>
                  <p className="text-clinical-text-secondary max-w-sm">Generating medical intelligence from consultation data.</p>
                </div>
              ) : (
                <div className="h-full flex flex-col space-y-6">
                  {/* Real-time Translation Feed */}
                  <div className="flex-1 min-h-[400px] flex flex-col bg-clinical-blue/10 rounded-2xl border border-clinical-accent/5 overflow-hidden">
                    <div className="p-4 border-b border-clinical-accent/10 flex justify-between items-center bg-clinical-blue/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-clinical-accent rounded-full animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-clinical-white">Translation Feed ({selectedLanguage})</h3>
                      </div>
                      <History className="w-4 h-4 text-clinical-text-secondary" />
                    </div>

                    {role === 'doctor' && (
                      <div className="p-2 flex gap-2 border-b border-clinical-accent/5">
                        <button
                          onClick={() => setActiveTab('current')}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'current' ? 'bg-clinical-accent text-clinical-navy' : 'bg-clinical-white/5'}`}
                        >
                          Visit
                        </button>
                        <button
                          onClick={() => setActiveTab('field')}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'field' ? 'bg-clinical-accent text-clinical-navy' : 'bg-clinical-white/5'}`}
                        >
                          Inbox
                        </button>
                        <button
                          onClick={() => setActiveTab('feed')}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'feed' ? 'bg-clinical-accent text-clinical-navy' : 'bg-clinical-white/5'}`}
                        >
                          Feed
                        </button>
                      </div>
                    )}

                    <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[500px] scrollbar-thin scrollbar-thumb-clinical-accent/20">
                      {translations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                          <MessageSquare className="w-12 h-12 mb-4" />
                          <p className="text-sm">Speak to start real-time translation</p>
                        </div>
                      ) : (
                        translations.map((t, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: t.role === 'doctor' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${t.role === 'doctor' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] p-4 rounded-2xl ${t.role === 'doctor' ? 'bg-clinical-accent text-clinical-navy rounded-tr-none' : 'bg-clinical-blue border border-clinical-accent/20 text-clinical-white rounded-tl-none'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase opacity-60">{t.role}</span>
                                {t.role === 'doctor' && <Volume2 className="w-3 h-3" />}
                              </div>
                              <p className="text-sm leading-relaxed">{t.text}</p>
                              <span className="text-[8px] opacity-40 mt-2 block">{new Date(t.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                      {isTranslating && (
                        <div className="flex justify-start">
                          <div className="bg-clinical-blue/50 border border-clinical-accent/10 p-4 rounded-2xl animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin text-clinical-accent" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-[100px] flex flex-col items-center justify-center text-center card-clinical bg-clinical-blue/20 border-none">
                    <ClipboardList className="w-8 h-8 text-clinical-text-secondary/20 mb-2" />
                    <h2 className="text-sm font-bold text-clinical-text-secondary/50 uppercase tracking-widest">Waiting for Full Analysis</h2>
                    <p className="text-[10px] text-clinical-text-secondary/40">Complete the consultation to generate official SOAP notes.</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultation;
