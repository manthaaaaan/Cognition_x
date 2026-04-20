import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ShieldCheck, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const [name, setName] = useState('');
  const [medicalId, setMedicalId] = useState('');
  const [errors, setErrors] = useState({ name: false, medicalId: false });
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = {
      name: !name,
      medicalId: !medicalId
    };
    setErrors(newErrors);

    if (name && medicalId) {
      localStorage.setItem('doctor_name', name);
      localStorage.setItem('medical_id', medicalId);
      navigate('/consultation');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-clinical-navy to-[#050B1B]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md card-clinical border-clinical-accent/30"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-clinical-navy rounded-full flex items-center justify-center border-2 border-clinical-accent mb-4 shadow-[0_0_20px_rgba(76,201,240,0.3)]">
            <Stethoscope className="w-10 h-10 text-clinical-accent" />
          </div>
          <h1 className="text-3xl font-bold text-clinical-white tracking-tight">Cognition<span className="text-clinical-accent">X</span></h1>
          <p className="text-clinical-text-secondary mt-2">Intelligent Clinical Assistant</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6" noValidate>
          <div>
            <label className="block text-sm font-medium text-clinical-text-secondary mb-2 ml-1">
              Doctor Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({...errors, name: false});
                }}
                className={`w-full bg-clinical-navy border rounded-lg py-3 px-4 text-clinical-white focus:outline-none transition-all ${
                  errors.name ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-clinical-text-secondary/30 focus:border-clinical-accent'
                }`}
                placeholder="Dr. Rajesh Kumar"
              />
              {errors.name && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold italic tracking-wide">Doctor name is required</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-clinical-text-secondary mb-2 ml-1">
              Medical Council ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={medicalId}
                onChange={(e) => {
                  setMedicalId(e.target.value);
                  if (errors.medicalId) setErrors({...errors, medicalId: false});
                }}
                className={`w-full bg-clinical-navy border rounded-lg py-3 px-4 text-clinical-white focus:outline-none transition-all ${
                  errors.medicalId ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-clinical-text-secondary/30 focus:border-clinical-accent'
                }`}
                placeholder="MCI-12345-REG"
              />
              <ShieldCheck className={`absolute right-3 top-3.5 w-5 h-5 transition-colors ${errors.medicalId ? 'text-red-500' : 'text-clinical-accent/50'}`} />
              {errors.medicalId && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold italic tracking-wide">Registration ID is required</p>}
            </div>
          </div>

          <div className="space-y-3">
            <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 group">
              Access Dashboard
              <Activity className="w-5 h-5 group-hover:animate-pulse" />
            </button>
            <p className="text-[10px] text-clinical-text-secondary/60 text-center italic">
              🔬 Demo Mode: Enter any name and Medical Council ID to simulate a doctor login
            </p>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-clinical-text-secondary/10 text-center">
          <p className="text-xs text-clinical-text-secondary flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Biometric authentication secured
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
