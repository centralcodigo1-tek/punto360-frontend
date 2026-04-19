import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, GitBranch, User, Lock, Loader2 } from 'lucide-react';
import { api } from '../../api/axios';

interface FormData {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  branchName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const initial: FormData = {
  companyName: '', companyEmail: '', companyPhone: '', companyAddress: '',
  branchName: 'Sede Principal',
  adminName: '', adminEmail: '', adminPassword: '',
};

interface FieldProps {
  label: string;
  name: keyof FormData;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

function Field({ label, name, value, onChange, type = 'text', placeholder, required }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-app-text-muted uppercase tracking-wide">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-app-bg border border-app-border focus:border-violet-500/50 rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none transition-all"
      />
    </div>
  );
}

export default function SuperAdminNewClientPage() {
  const [form, setForm] = useState<FormData>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/superadmin/clients', form);
      navigate('/superadmin');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/superadmin')}
          className="p-2 rounded-xl bg-app-card border border-app-border text-app-text-muted hover:text-app-text transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-app-text">Nuevo cliente</h1>
          <p className="text-sm text-app-text-muted mt-0.5">Se crea la empresa, sucursal, usuario admin y suscripción anual</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Empresa */}
        <section className="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-app-text mb-1">
            <Building2 size={15} className="text-violet-400" />
            Datos de la empresa
          </div>
          <Field label="Nombre" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Ej. Tienda El Éxito" required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" name="companyEmail" value={form.companyEmail} onChange={handleChange} type="email" placeholder="empresa@email.com" />
            <Field label="Teléfono" name="companyPhone" value={form.companyPhone} onChange={handleChange} placeholder="300 000 0000" />
          </div>
          <Field label="Dirección" name="companyAddress" value={form.companyAddress} onChange={handleChange} placeholder="Calle 123 # 45-67" />
        </section>

        {/* Sucursal */}
        <section className="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-app-text mb-1">
            <GitBranch size={15} className="text-violet-400" />
            Sucursal principal
          </div>
          <Field label="Nombre de la sucursal" name="branchName" value={form.branchName} onChange={handleChange} placeholder="Sede Principal" required />
        </section>

        {/* Usuario admin */}
        <section className="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-app-text mb-1">
            <User size={15} className="text-violet-400" />
            Usuario administrador
          </div>
          <Field label="Nombre completo" name="adminName" value={form.adminName} onChange={handleChange} placeholder="Juan Pérez" required />
          <Field label="Email" name="adminEmail" value={form.adminEmail} onChange={handleChange} type="email" placeholder="admin@empresa.com" required />
          <div className="relative">
            <Field label="Contraseña" name="adminPassword" value={form.adminPassword} onChange={handleChange} type="password" placeholder="Mínimo 6 caracteres" required />
            <Lock size={13} className="absolute right-4 bottom-3 text-app-text-muted pointer-events-none" />
          </div>
        </section>

        {/* Suscripción info */}
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 text-sm text-violet-300">
          Se creará automáticamente una suscripción anual de <strong>$800.000 COP</strong> con inicio hoy.
        </div>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-all"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : 'Crear cliente'}
        </button>
      </form>
    </div>
  );
}
