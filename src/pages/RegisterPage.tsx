import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Store, User, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, Factory } from 'lucide-react';
import { api } from '../api/axios';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        // Company
        companyName: '',
        documentNumber: '',
        companyPhone: '',
        // Branch
        branchName: '',
        branchAddress: '',
        // User
        userName: '',
        userEmail: '',
        userPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => {
        setError('');
        if (step === 1 && !formData.companyName) return setError('El nombre de la empresa es obligatorio.');
        if (step === 2 && !formData.branchName) return setError('El nombre de la sucursal es obligatorio.');
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!formData.userName || !formData.userEmail || !formData.userPassword) {
            return setError('Todos los datos del usuario son obligatorios.');
        }

        setLoading(true);
        try {
            await api.post('/companies/onboard', formData);
            // Simulate brief success state before redirecting
            setTimeout(() => {
                navigate('/login', { state: { message: '¡Cuenta creada! Ya puedes iniciar sesión.' } });
            }, 1500);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || 'Error al conectar con el servidor.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black relative overflow-hidden">
            {/* Background elements for aesthetic */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

            <div className="w-full max-w-md p-8 relative z-10 flex flex-col items-center">
                
                {/* Logo / Title Area */}
                <div className="mb-8 text-center text-white">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
                            <Factory size={36} className="text-cyan-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">PUNTO 360</h1>
                    <p className="text-gray-300 font-light text-sm">Registra tu empresa y expande tu negocio</p>
                </div>

                {/* Glassmorphism Card */}
                <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
                    
                    {/* Progress Bar */}
                    <div className="flex w-full h-1 bg-white/5">
                        <div className={`h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500 ease-in-out`} style={{ width: `${(step / 3) * 100}%` }} />
                    </div>

                    <div className="p-8">
                        {error && (
                            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}>
                            
                            {/* STEP 1 */}
                            <div className={`transition-all duration-500 ${step === 1 ? 'block opacity-100 transform translate-x-0' : 'hidden opacity-0'}`}>
                                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                                    <Building2 className="text-cyan-400" size={20} /> Datos de la Empresa
                                </h2>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Nombre de la empresa" required
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="relative">
                                        <input type="text" name="documentNumber" value={formData.documentNumber} onChange={handleChange} placeholder="RUC / NIT (Opcional)"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="relative">
                                        <input type="text" name="companyPhone" value={formData.companyPhone} onChange={handleChange} placeholder="Teléfono celular"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* STEP 2 */}
                            <div className={`transition-all duration-500 ${step === 2 ? 'block opacity-100 transform translate-x-0' : 'hidden opacity-0'}`}>
                                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                                    <Store className="text-cyan-400" size={20} /> Tu Primera Sucursal
                                </h2>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="text" name="branchName" value={formData.branchName} onChange={handleChange} placeholder="Nombre de la sucursal (Ej. Principal)" required
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="relative">
                                        <input type="text" name="branchAddress" value={formData.branchAddress} onChange={handleChange} placeholder="Dirección de la sucursal"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* STEP 3 */}
                            <div className={`transition-all duration-500 ${step === 3 ? 'block opacity-100 transform translate-x-0' : 'hidden opacity-0'}`}>
                                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                                    <User className="text-cyan-400" size={20} /> Administrador
                                </h2>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="text" name="userName" value={formData.userName} onChange={handleChange} placeholder="Nombre completo" required
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="email" name="userEmail" value={formData.userEmail} onChange={handleChange} placeholder="Correo electrónico" required
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="password" name="userPassword" value={formData.userPassword} onChange={handleChange} placeholder="Contraseña" required minLength={6}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="mt-8 flex gap-3">
                                {step > 1 && (
                                    <button type="button" onClick={prevStep} disabled={loading}
                                        className="w-1/3 flex items-center justify-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gray-400">
                                        <ArrowLeft size={18} />
                                    </button>
                                )}
                                
                                {step < 3 ? (
                                    <button type="button" onClick={nextStep}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        Siguiente <ArrowRight size={18} />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>Finalizar Registro <CheckCircle2 size={18} /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                <div className="mt-6 text-center text-gray-400 text-sm">
                    ¿Ya tienes una cuenta de empresa?{' '}
                    <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                        Inicia sesión aquí
                    </Link>
                </div>
            </div>
        </div>
    );
}
