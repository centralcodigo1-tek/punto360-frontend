import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { 
  Users, ShieldCheck, Plus, Trash2, Edit2, 
  CheckCircle2, XCircle, Loader2, Building2,
  Lock, UserPlus, Info
} from "lucide-react";

// --- Interfaces ---
interface RolePermission {
  permissions: {
    id: string;
    key: string;
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
  role_permissions: RolePermission[];
}

interface UserBranch {
  branches: {
    id: string;
    name: string;
  };
}

interface UserRole {
  roles: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  user_name: string;
  is_active: boolean;
  user_roles: UserRole[];
  user_branches: UserBranch[];
}

interface Branch {
  id: string;
  name: string;
}

export default function UsersRolesPage() {
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modales
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    user_name: "",
    password: "",
    roleIds: [] as string[],
    branchIds: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [uRes, rRes, bRes] = await Promise.all([
        api.get("/users"),
        api.get("/roles"),
        api.get("/branches")
      ]);
      setUsers(uRes.data);
      setRoles(rRes.data);
      setBranches(bRes.data);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenUserModal = (user: User | null = null) => {
    if (user) {
      setCurrentUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        user_name: user.user_name,
        password: "", // No mostramos el pass actual
        roleIds: user.user_roles.map(ur => ur.roles.id),
        branchIds: user.user_branches.map(ub => ub.branches.id)
      });
    } else {
      setCurrentUser(null);
      setFormData({ name: "", email: "", user_name: "", password: "", roleIds: [], branchIds: [] });
    }
    setShowUserModal(true);
  };

  const handleSubmitUser = async () => {
    if (!formData.name || !formData.email || !formData.user_name) {
      alert("Por favor completa los campos básicos.");
      return;
    }
    if (!currentUser && !formData.password) {
      alert("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentUser) {
        await api.put(`/users/${currentUser.id}`, formData);
        alert("Usuario actualizado correctamente.");
      } else {
        await api.post("/users", formData);
        alert("Usuario creado correctamente.");
      }
      setShowUserModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`¿Seguro que deseas eliminar a ${user.name}?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || "Error al eliminar usuario");
    }
  };

  const toggleBranch = (id: string) => {
    setFormData(prev => ({
      ...prev,
      branchIds: prev.branchIds.includes(id) 
        ? prev.branchIds.filter(bid => bid !== id) 
        : [...prev.branchIds, id]
    }));
  };

  const toggleRole = (id: string) => {
    setFormData(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(id)
        ? prev.roleIds.filter(rid => rid !== id)
        : [...prev.roleIds, id]
    }));
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users size={32} className="text-cyan-400" />
            Configuración del Equipo
          </h1>
          <p className="text-white/40 mt-1">Administra los usuarios, sus roles y los permisos de acceso.</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start">
          <button 
            onClick={() => setActiveTab("users")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "users" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-white/50 hover:text-white"}`}
          >
            Usuarios
          </button>
          <button 
            onClick={() => setActiveTab("roles")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "roles" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-white/50 hover:text-white"}`}
          >
            Roles y Permisos
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-cyan-400" size={48} />
        </div>
      ) : activeTab === "users" ? (
        /* --- TAB USUARIOS --- */
        <div className="space-y-6">
          <div className="flex justify-end">
             <button 
              onClick={() => handleOpenUserModal()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
             >
                <UserPlus size={18} /> Nuevo Usuario
             </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-bold text-white/40 tracking-wider">
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Roles</th>
                    <th className="px-6 py-4">Sucursales</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{user.name}</span>
                          <span className="text-white/40 text-xs">{user.email} | @{user.user_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.user_roles.map(ur => (
                            <span key={ur.roles.id} className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded uppercase">
                              {ur.roles.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.user_branches.map(ub => (
                            <span key={ub.branches.id} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase flex items-center gap-1">
                              <Building2 size={10} /> {ub.branches.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_active ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                            <CheckCircle2 size={14} /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-400 text-xs font-bold">
                            <XCircle size={14} /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => handleOpenUserModal(user)} className="p-2 text-white/30 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all">
                              <Edit2 size={16} />
                           </button>
                           <button onClick={() => handleDeleteUser(user)} className="p-2 text-white/30 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all">
                              <Trash2 size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* --- TAB ROLES --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <div key={role.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl border-t-4 border-t-cyan-500">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{role.name}</h3>
                  <ShieldCheck className="text-cyan-400" size={24} />
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Permisos Asignados</p>
                  <div className="flex flex-col gap-2">
                    {role.role_permissions.map(rp => (
                      <div key={rp.permissions.id} className="flex items-center gap-2 text-xs text-white/70">
                         <div className="w-1 h-1 rounded-full bg-cyan-500" />
                         {rp.permissions.name}
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-2 text-[10px] text-white/30">
                  <Info size={12} />
                  <span>Este rol es predeterminado y no puede editarse.</span>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL USUARIO */}
      {showUserModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowUserModal(false)}></div>
          <div className="relative w-full max-w-2xl bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
             <div className="px-8 py-6 border-b border-white/5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                   {currentUser ? <Edit2 size={20} className="text-cyan-400" /> : <Plus size={20} className="text-cyan-400" />}
                   {currentUser ? "Editar Usuario" : "Nuevo Usuario de Equipo"}
                </h3>
             </div>

             <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="Ej. Juan Pérez"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Email</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="juan@ejemplo.com"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Nombre de Usuario</label>
                      <input 
                        type="text" 
                        value={formData.user_name}
                        onChange={e => setFormData({...formData, user_name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="perez_juan"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Contraseña</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                          placeholder={currentUser ? "Vacío para no cambiar" : "*******"}
                        />
                        <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />
                      </div>
                   </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* SELECCIÓN DE ROLES */}
                   <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 block">Asignar Roles</label>
                      <div className="space-y-2">
                         {roles.map(role => (
                           <button 
                             key={role.id}
                             onClick={() => toggleRole(role.id)}
                             className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${formData.roleIds.includes(role.id) ? "bg-cyan-500/10 border-cyan-500/50 text-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"}`}
                           >
                              <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className={formData.roleIds.includes(role.id) ? "text-cyan-400" : "text-white/20"} />
                                <span className="text-sm font-medium">{role.name}</span>
                              </div>
                              {formData.roleIds.includes(role.id) && <CheckCircle2 size={16} className="text-cyan-400" />}
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* SELECCIÓN DE SUCURSALES */}
                   <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 block">Accesos a Sucursales</label>
                      <div className="space-y-2">
                         {branches.map(branch => (
                           <button 
                             key={branch.id}
                             onClick={() => toggleBranch(branch.id)}
                             className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${formData.branchIds.includes(branch.id) ? "bg-blue-500/10 border-blue-500/50 text-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"}`}
                           >
                              <div className="flex items-center gap-2">
                                <Building2 size={16} className={formData.branchIds.includes(branch.id) ? "text-blue-400" : "text-white/20"} />
                                <span className="text-sm font-medium">{branch.name}</span>
                              </div>
                              {formData.branchIds.includes(branch.id) && <CheckCircle2 size={16} className="text-blue-400" />}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-8 bg-white/5 border-t border-white/5 flex gap-4">
                <button 
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-4 text-white/50 font-bold hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmitUser}
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                   {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                   {currentUser ? "Actualizar Usuario" : "Crear Usuario"}
                </button>
             </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
