import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Loader2, ClipboardList, CheckCircle2, AlertCircle, ArrowRight, Activity, ChevronDown, UserPlus, Sparkles } from 'lucide-react';
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
}

const MOCK_PATIENTS = [
  {
    id: 1,
    name: "Rajesh Sharma",
    ageSex: "35 / Male",
    complaint: "Fever, Headache, Body Ache",
    diagnosis: "Acute Febrile Illness",
    soap: {
      subjective: "Patient is a 35yr male, fever 3 days, headache, body ache. No history of cough or travel.",
      objective: "Temp: 101°F, BP: 120/80, HR: 88 bpm. Throat: Mild congestion.",
      assessment: "Acute Febrile Illness (Suspected Viral). ICD-10: R50.9",
      plan: "1. Tab. Paracetamol 500mg (1-1-1) 3 days\n2. Tab. Cetirizine 10mg (0-0-1) 5 days\n3. Plenty of oral fluids and rest.",
      patient_name: "Rajesh Sharma",
      patient_age: "35",
      patient_sex: "Male",
      vitals_string: "BP 120/80, Temp 101°F, HR 88bpm"
    }
  },
  {
    id: 2,
    name: "Sunita Gupta",
    ageSex: "58 / Female",
    complaint: "Diabetes Follow-up, Blurred Vision",
    diagnosis: "Type 2 Diabetes Mellitus",
    soap: {
      subjective: "58yr female, Type 2 diabetes follow-up. Complains of occasional blurred vision and polyuria.",
      objective: "Blood sugar (RBS): 180mg/dL, BP: 140/90, Weight: 76kg.",
      assessment: "Uncontrolled Type 2 Diabetes Mellitus & Stage 1 Hypertension. ICD-10: E11.9, I10",
      plan: "1. Tab. Metformin 500mg (1-0-1) before food\n2. Tab. Amlodipine 5mg (0-0-1) night\n3. HbA1c test and Ophthalmology referral.",
      patient_name: "Sunita Gupta",
      patient_age: "58",
      patient_sex: "Female",
      vitals_string: "BP 140/90, Blood Sugar 180mg/dL"
    }
  },
  {
    id: 3,
    name: "Aakash Patel",
    ageSex: "28 / Male",
    complaint: "Dry Cough, Mild Fever",
    diagnosis: "Upper Respiratory Infection",
    soap: {
      subjective: "28yr male, dry cough 1 week, mild fever. Non-smoker, no allergies mentioned.",
      objective: "Temp: 99.2°F, SpO2: 98%. Chest: Clear on auscultation.",
      assessment: "Upper Respiratory Tract Infection. ICD-10: J06.9",
      plan: "1. Tab. Azithromycin 500mg (1-0-0) 3 days\n2. Salbutamol inhaler as needed for cough\n3. Steam inhalation twice daily.",
      patient_name: "Aakash Patel",
      patient_age: "28",
      patient_sex: "Male",
      vitals_string: "BP 118/76, Temp 99.5°F, SpO2 97%"
    }
  }
];

const Consultation: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showMockMenu, setShowMockMenu] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const doctorName = localStorage.getItem('doctor_name') || 'Doctor';

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
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

  const handleMockSelect = (mock: typeof MOCK_PATIENTS[0]) => {
    setShowMockMenu(false);
    setIsProcessing(true);
    setSoapNote(null);
    setError(null);

    // Simulate AI processing time
    setTimeout(() => {
      setIsProcessing(false);
      setIsDemoMode(true);
      setSoapNote(mock.soap);
      localStorage.setItem('last_soap_note', JSON.stringify(mock.soap));
    }, 1500);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setSoapNote(null);
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'consultation.wav');

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-clinical-navy p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-clinical-white">Consultation Room</h1>
              <p className="text-clinical-text-secondary">Logged in as: <span className="text-clinical-accent">{doctorName}</span></p>
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
                  ? 'The AI is listening and capturing clinical data in real-time.' 
                  : 'Start the recording or use a mock preset for demonstration.'}
              </p>

              <div className="text-4xl font-mono text-clinical-white mb-8">
                {formatTime(recordingTime)}
              </div>

              <div className="flex flex-col gap-3 w-full px-6">
                {!isRecording ? (
                  <>
                    <button 
                      onClick={startRecording}
                      disabled={isProcessing}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </button>
                    
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
                  </>
                ) : (
                  <button 
                    onClick={stopRecording}
                    className="bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-red-600/30 w-full flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    Stop Recording
                  </button>
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
                  <div className="flex justify-between items-center bg-clinical-blue p-6 rounded-xl border border-clinical-accent/30 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-clinical-accent/20 p-3 rounded-lg">
                        <ClipboardList className="w-8 h-8 text-clinical-accent" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-clinical-white">
                          Generated SOAP Note {isDemoMode && <span className="text-clinical-accent text-sm ml-2">(Preset)</span>}
                        </h2>
                        <p className="text-sm text-clinical-text-secondary">
                          {isDemoMode ? 'Mock evaluation for demonstration' : 'Draft created by CognitionX AI'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/prescription')}
                      className="bg-clinical-white text-clinical-navy font-bold py-2 px-6 rounded-lg hover:bg-clinical-accent hover:text-clinical-navy transition-all flex items-center gap-2 group"
                    >
                      Next: Prescription
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Only show the 4 main SOAP fields in the view cards */}
                    {['subjective', 'objective', 'assessment', 'plan'].map((key, index) => (
                      <motion.div 
                        key={key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="card-clinical relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-clinical-accent"></div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-clinical-accent mb-3">{key}</h3>
                        <p className="text-clinical-white text-sm leading-relaxed whitespace-pre-wrap">{(soapNote as any)[key]}</p>
                      </motion.div>
                    ))}
                  </div>
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
                <div className="h-[500px] flex flex-col items-center justify-center text-center card-clinical bg-clinical-blue/20 border-none">
                  <ClipboardList className="w-16 h-16 text-clinical-text-secondary/20 mb-4" />
                  <h2 className="text-xl font-semibold text-clinical-text-secondary/50">Waiting for Consultation Data</h2>
                  <p className="text-clinical-text-secondary/30 max-w-sm">Use the recording button or a mock patient to populate data.</p>
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
