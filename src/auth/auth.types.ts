export interface User {
  sub: string;
  email: string;
  userName: string;
  role: string | null;
  companyId: string;
  companyName: string | null;
  branchIds: string[];
  permissions: string[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}
