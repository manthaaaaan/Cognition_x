import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Printer, User, Award, Calendar, CheckCircle, ChevronLeft, Loader2, Fingerprint, ShieldCheck, ShieldAlert, Lock, Clock, MessageSquare, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import SignaturePad from '../components/SignaturePad';

type AuthStep = 'none' | 'mc_verify' | 'biometric' | 'completed';

const Prescription: React.FC = () => {
  const [isSigned, setIsSigned] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('none');
  const [isVerifying, setIsVerifying] = useState(false);
  const [enteredMcId, setEnteredMcId] = useState('');
  const [authTimestamp, setAuthTimestamp] = useState('');
  const navigate = useNavigate();

  // Chat Assistant State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    {role: 'assistant', content: "Hello! I am your clinical RAG assistant. I've analyzed the patient's records. Do you have any questions about the diagnosis, dietary limits, or medication safety?"}
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: 'user' as const, content: chatInput };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://cognitionx-production.up.railway.app';
      const response = await axios.post(`${API_URL}/api/chat/`, {
        question: userMessage.content,
        context: lastSoap,
        history: messages.slice(1) // exclude initial greeting
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't reach the backend server. Please make sure it is running locally on port 8000." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const doctorName = localStorage.getItem('doctor_name') || 'Dr. Rajesh Kumar';
  const medicalId = localStorage.getItem('medical_id') || 'MCI-12345-REG';
  const lastSoap = JSON.parse(localStorage.getItem('last_soap_note') || '{}');

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  useEffect(() => {
    // Pre-fill MC ID for the demo modal
    if (authStep === 'mc_verify') {
      setEnteredMcId(medicalId);
    }
  }, [authStep, medicalId]);

  const handleStartAuth = () => {
    if (signatureImage) {
      setAuthStep('mc_verify');
    }
  };

  const handleVerifyMcId = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setAuthStep('biometric');
    }, 1500);
  };

  const handleBiometricScan = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setAuthStep('completed');
      setIsSigned(true);
      setAuthTimestamp(new Date().toLocaleString());
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#4CC9F0', '#00FF9D', '#F8FAFC']
      });
    }, 3000);
  };

  const handleDownload = async () => {
    const element = document.getElementById('prescription-document');
    if (!element) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#F8FAFC',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const patientName = lastSoap.patient_name ? lastSoap.patient_name.replace(/\s+/g, '_') : 'Patient';
      const fileDate = new Date().toISOString().split('T')[0];

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CognitionX_Rx_${patientName}_${fileDate}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const displayField = (value: string | null | undefined) => {
    if (!value || value.trim() === "") {
      return <span className="text-clinical-navy/30 italic font-medium">Not recorded</span>;
    }
    return value;
  };

  const ageSexDisplay = () => {
    const age = lastSoap.patient_age;
    const sex = lastSoap.patient_sex;
    if (!age && !sex) return <span className="text-clinical-navy/30 italic font-medium">Not recorded</span>;
    return `${age || 'Age N/A'} / ${sex || 'Sex N/A'}`;
  };

  return (
    <div className="min-h-screen bg-clinical-navy p-6 md:p-8 flex flex-col items-center">
      <AnimatePresence>
        {authStep !== 'none' && authStep !== 'completed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-clinical-navy/90 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-clinical-blue border border-clinical-accent/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-clinical-navy/50">
                <motion.div
                  className="h-full bg-clinical-accent"
                  initial={{ width: '0%' }}
                  animate={{ width: authStep === 'mc_verify' ? '50%' : '100%' }}
                />
              </div>

              {authStep === 'mc_verify' ? (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-clinical-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-clinical-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-clinical-white">Identity Verification</h3>
                  <p className="text-clinical-text-secondary">Please confirm your Medical Council ID to continue.</p>

                  <div className="space-y-4">
                    <div className="text-left">
                      <label className="text-xs uppercase font-bold text-clinical-text-secondary mb-1 block">Medical Council ID</label>
                      <input
                        type="text"
                        value={enteredMcId}
                        onChange={(e) => setEnteredMcId(e.target.value)}
                        className="w-full bg-clinical-navy border border-clinical-accent/20 rounded-xl px-4 py-3 text-clinical-white font-mono focus:border-clinical-accent outline-none transition-all"
                      />
                    </div>

                    <button
                      onClick={handleVerifyMcId}
                      disabled={isVerifying || enteredMcId !== medicalId}
                      className="w-full btn-primary flex items-center justify-center gap-2 py-4"
                    >
                      {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {isVerifying ? 'Verifying...' : 'Verify Identity (DEMO !)'}
                    </button>

                    {enteredMcId !== medicalId && (
                      <p className="text-red-400 text-xs flex items-center gap-1 justify-center">
                        <ShieldAlert className="w-3 h-3" /> ID does not match session records
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 text-center py-4">
                  <div className="relative mx-auto w-32 h-32">
                    {/* Pulsing rings */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-clinical-accent/20 rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Fingerprint className={`w-16 h-16 transition-colors duration-500 ${isVerifying ? 'text-clinical-accent' : 'text-clinical-text-secondary'}`} />
                    </div>
                    {/* Scanning Line */}
                    {isVerifying && (
                      <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-clinical-accent shadow-[0_0_15px_rgba(0,255,157,0.8)] z-10"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-clinical-white">Biometric Scan</h3>
                    <p className="text-clinical-text-secondary">
                      {isVerifying ? 'Scanning fingerprint... (DEMO !)' : 'Place your finger on the sensor for final authentication. '}
                    </p>
                  </div>

                  {!isVerifying ? (
                    <button
                      onClick={handleBiometricScan}
                      className="w-full py-4 bg-clinical-accent/10 border border-clinical-accent/40 text-clinical-accent rounded-xl font-bold hover:bg-clinical-accent/20 transition-all"
                    >
                      Initialize Scanner (Demo !)
                    </button>
                  ) : (
                    <div className="text-clinical-accent font-bold animate-pulse text-sm">
                      ENCRYPTING AUTHENTICATION TOKEN...
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <button
          onClick={() => navigate('/consultation')}
          className="flex items-center gap-2 text-clinical-text-secondary hover:text-clinical-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Consultation
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="p-2 text-clinical-text-secondary hover:text-clinical-white transition-colors"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-4xl">
        {/* Left: The Prescription Card */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            id="prescription-document"
            className="card-clinical bg-[#F8FAFC] text-clinical-navy p-10 shadow-2xl relative overflow-hidden flex flex-col"
            style={{ minHeight: '850px' }}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-clinical-navy/10 pb-8 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-extrabold uppercase tracking-tight text-clinical-navy">DR {doctorName.toUpperCase()}</h1>
                  {authStep === 'completed' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" /> BIOMETRIC + MC VERIFIED
                    </motion.div>
                  )}
                </div>
                <p className="text-md font-semibold text-clinical-navy/70">Consultant Physician</p>
                <div className="mt-4 space-y-1 text-sm text-clinical-navy/60 font-medium">
                  <p className="flex items-center gap-2"><Award className="w-4 h-4" /> Reg No: {medicalId}</p>
                  <p className="flex items-center gap-2"><FileText className="w-4 h-4" /> CognitionX Digital Health Network</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-clinical-navy mb-2">Rx</div>
                <p className="text-sm font-bold flex items-center justify-end gap-2 text-clinical-navy/70 uppercase">
                  <Calendar className="w-4 h-4" /> {today}
                </p>
              </div>
            </div>

            {/* Patient Info Block */}
            <div className="grid grid-cols-2 gap-8 mb-10 bg-clinical-navy/5 p-4 rounded-lg">
              <div>
                <span className="text-[10px] uppercase font-bold text-clinical-navy/40 tracking-wider">Patient Name</span>
                <p className="font-bold border-b border-clinical-navy/20 pb-1 mt-1">
                  {displayField(lastSoap.patient_name)}
                </p>
              </div>
              <div className="grid grid-cols-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-clinical-navy/40 tracking-wider">Age/Sex</span>
                  <p className="font-bold border-b border-clinical-navy/20 pb-1 mt-1">
                    {ageSexDisplay()}
                  </p>
                </div>
                <div className="pl-4">
                  <span className="text-[10px] uppercase font-bold text-clinical-navy/40 tracking-wider">Vitals</span>
                  <p className="font-bold border-b border-clinical-navy/20 pb-1 mt-1 text-xs">
                    {displayField(lastSoap.vitals_string)}
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnosis / Plan */}
            <div className="space-y-8 flex-grow">
              <section>
                <h3 className="text-xs font-black uppercase text-clinical-navy/30 mb-3 tracking-[0.2em]">Diagnosis</h3>
                <p className="text-lg font-bold leading-relaxed">{lastSoap.assessment || 'Initial Consultation'}</p>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase text-clinical-navy/30 mb-3 tracking-[0.2em]">Medication & Plan</h3>
                <div className="text-md font-medium leading-loose space-y-4">
                  <p className="whitespace-pre-wrap">{lastSoap.plan || 'No plan provided'}</p>
                </div>
              </section>
            </div>

            {/* Audit Trail & Signature */}
            <div className="border-t-2 border-clinical-navy/5 mt-10 pt-8 flex justify-between items-end">
              <div className="space-y-4">
                {authStep === 'completed' && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-clinical-navy/30 tracking-widest">Digital Audit Trail</h4>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Biometric Authentication: Verified
                      </p>
                      <p className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Medical Council ID: Confirmed
                      </p>
                      <p className="text-[10px] font-medium text-clinical-navy/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Signed On: {authTimestamp}
                      </p>
                    </div>
                  </div>
                )}
                <div className="opacity-40">
                  <p className="text-[10px] uppercase font-bold tracking-widest leading-tight">
                    Issued by CognitionX Clinical AI Engine<br />
                    Verified Electronic Prescription
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-48 h-20 border-b-2 border-clinical-navy/30 mb-2 flex flex-col items-center justify-center overflow-hidden relative">
                  {isSigned && signatureImage && (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={signatureImage}
                      alt="Doctor Signature"
                      className="h-16 mb-1"
                    />
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-clinical-navy/40 mb-2">Authorized Signature</p>

                {authStep === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center bg-green-50/50 border border-green-200 rounded-lg p-2 mt-1 w-full"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-green-500 rounded-full p-0.5">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-[9px] font-black uppercase text-green-700 tracking-tighter">Digitally Signed & Biometric Verified</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[8px] text-green-600 font-bold">
                      <span>DR {doctorName.toUpperCase()}</span>
                      <span>•</span>
                      <span>{medicalId}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[7px] text-green-500/70 mt-1 uppercase font-black">
                      <Fingerprint className="w-2.5 h-2.5" /> Identity Confirmed • {authTimestamp}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Watermark */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -rotate-45 transition-all duration-1000 ${authStep === 'completed' ? 'opacity-[0.05] text-green-600' : 'opacity-[0.03] text-clinical-navy'}`}>
              <h1 className="text-[150px] font-black uppercase tracking-[0.2em]">
                {authStep === 'completed' ? 'VERIFIED' : 'DRAFT'}
              </h1>
            </div>
          </motion.div>
        </div>

        {/* Right: Actions Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card-clinical border-clinical-accent/30 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-clinical-accent" />
              Finalize Document
            </h2>

            {authStep !== 'completed' ? (
              <div className="space-y-4">
                <p className="text-sm text-clinical-text-secondary">
                  Please review the prescription. Sign below to initialize the multi-step authentication.
                </p>
                <div className="bg-clinical-navy rounded-xl p-4">
                  <SignaturePad onSave={(data) => setSignatureImage(data)} />
                </div>
                <button
                  onClick={handleStartAuth}
                  disabled={!signatureImage}
                  className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${signatureImage
                    ? 'bg-clinical-accent text-clinical-navy hover:scale-105 active:scale-95 shadow-lg shadow-clinical-accent/20'
                    : 'bg-clinical-text-secondary/20 text-clinical-text-secondary cursor-not-allowed'
                    }`}
                >
                  Confirm & Authenticate
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-green-500 rounded-full p-2">
                    <ShieldCheck className="w-5 h-5 text-clinical-navy" />
                  </div>
                  <div>
                    <p className="font-bold text-green-500">Identity Secure</p>
                    <p className="text-xs text-clinical-text-secondary">All security levels cleared.</p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full btn-primary flex items-center justify-center gap-3"
                >
                  {isDownloading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  {isDownloading ? 'Generating PDF...' : 'Download PDF Rx'}
                </button>

                <button
                  onClick={() => navigate('/consultation')}
                  className="w-full py-3 bg-clinical-blue hover:bg-clinical-blue/70 text-clinical-white border border-clinical-text-secondary/20 rounded-xl font-bold transition-all text-sm"
                >
                  Start New Consultation
                </button>
              </motion.div>
            )}
          </div>


        </div>
      </div>

      {/* Floating Chat UI */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-8 w-96 max-w-[90vw] bg-clinical-blue border border-clinical-accent/30 shadow-2xl shadow-clinical-accent/20 rounded-2xl overflow-hidden z-40 flex flex-col"
            style={{ height: '500px' }}
          >
            <div className="bg-clinical-navy p-4 flex items-center justify-between border-b border-clinical-accent/20">
              <h2 className="text-sm font-bold flex items-center gap-2 text-clinical-white">
                <MessageSquare className="w-4 h-4 text-clinical-accent" />
                Clinical AI Assistant
              </h2>
              <button onClick={() => setIsChatOpen(false)} className="text-clinical-text-secondary hover:text-clinical-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-clinical-accent/20">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-clinical-accent text-clinical-navy font-medium rounded-tr-sm' : 'bg-clinical-navy/50 text-clinical-white border border-clinical-accent/20 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-clinical-navy/50 text-clinical-white border border-clinical-accent/20 rounded-2xl rounded-tl-sm p-3 flex gap-2 items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-clinical-accent" />
                    <span className="text-xs text-clinical-text-secondary">Analyzing records...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-clinical-navy border-t border-clinical-accent/20 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about diet, meds..."
                className="flex-grow bg-clinical-blue/50 border border-clinical-accent/20 rounded-xl px-4 py-2 text-sm text-clinical-white focus:border-clinical-accent outline-none"
              />
              <button
                onClick={handleSendMessage}
                disabled={isChatLoading || !chatInput.trim()}
                className="bg-clinical-accent text-clinical-navy p-2 rounded-xl hover:bg-clinical-accent/90 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-clinical-accent rounded-full shadow-[0_0_20px_rgba(0,255,157,0.4)] flex items-center justify-center text-clinical-navy z-50 hover:bg-clinical-white transition-colors"
      >
        {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

export default Prescription;
