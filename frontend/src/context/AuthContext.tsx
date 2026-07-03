import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getMe, loginApi, getVendorMe, getInterviewerMe } from "@/api/resumeiq";
import { toast } from "sonner";

interface User {
  id?: number;
  email: string;
  name: string;
  role: string;
  company_id?: number;
}

interface Vendor {
  id: number;
  email: string;
  name: string;
  company_name: string;
  role: string;
}

interface Interviewer {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isVendorAuthenticated: boolean;
  isInterviewerAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  vendor: Vendor | null;
  interviewer: Interviewer | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// For backward compatibility with Vendor components
export const useVendorAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useVendorAuth must be used within AuthProvider");
  return {
    isVendorAuthenticated: ctx.isVendorAuthenticated,
    isVendorLoading: ctx.isLoading,
    vendor: ctx.vendor,
    vendorLogin: ctx.login,
    vendorLogout: ctx.logout
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [interviewer, setInterviewer] = useState<Interviewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const checkAuth = async () => {
    const token = localStorage.getItem("resumeiq_token");
    if (!token) {
      setUser(null);
      setVendor(null);
      setInterviewer(null);
      setIsLoading(false);
      return;
    }

    try {
      // Decode JWT to see role without calling backend first
      let role = "";
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        role = payload.role;
      } catch (e) {
        console.error("Failed to parse token payload");
      }

      if (role === "vendor") {
        try {
          const vMe = await getVendorMe();
          setVendor(vMe);
          setUser(null);
          setInterviewer(null);
        } catch (vErr) {
          localStorage.removeItem("resumeiq_token");
          setVendor(null);
        }
      } else if (role === "interviewer") {
        try {
          const iMe = await getInterviewerMe();
          setInterviewer(iMe);
          setUser(null);
          setVendor(null);
        } catch (iErr) {
          localStorage.removeItem("resumeiq_token");
          setInterviewer(null);
        }
      } else {
        try {
          const me = await getMe();
          setUser({
            id: me.id,
            email: me.email, 
            name: me.name,
            role: me.role,
            company_id: me.company_id
          });
          setVendor(null);
          setInterviewer(null);
        } catch (err) {
          try {
            const vMe = await getVendorMe();
            setVendor(vMe);
            setUser(null);
            setInterviewer(null);
          } catch (vErr) {
            try {
              const iMe = await getInterviewerMe();
              setInterviewer(iMe);
              setUser(null);
              setVendor(null);
            } catch (iErr) {
              localStorage.removeItem("resumeiq_token");
              setUser(null);
              setVendor(null);
              setInterviewer(null);
            }
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await loginApi(email, password);
      localStorage.setItem("resumeiq_token", data.access_token);

      if (data.role === "vendor" || data.vendor) {
        const vendorData: Vendor = data.vendor || { 
          id: (data as any).vendor_id || 0, 
          email: email, 
          name: (data as any).name || "Vendor", 
          company_name: (data as any).company_name || "Company",
          role: "vendor" 
        };
        setVendor(vendorData);
        setUser(null);
        setInterviewer(null);
        // Using window.location.href for vendor portal to ensure clean state
        window.location.href = "/vendor";
      } else if (data.role === "interviewer" || data.interviewer) {
        const interviewerData: Interviewer = data.interviewer || {
          id: (data as any).interviewer_id || 0,
          email: email,
          name: (data as any).name || "Interviewer",
          role: "interviewer"
        };
        setInterviewer(interviewerData);
        setUser(null);
        setVendor(null);
        window.location.href = "/interviewer";
      } else {
        setUser({
          email: data.user?.email || email,
          name: data.user?.name || "User",
          role: data.role
        });
        setVendor(null);
        setInterviewer(null);
        navigate("/");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("resumeiq_token");
    setUser(null);
    setVendor(null);
    setInterviewer(null);
    window.location.href = "/login";
  };


  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      isVendorAuthenticated: !!vendor,
      isInterviewerAuthenticated: !!interviewer,
      isLoading,
      user,
      vendor,
      interviewer,
      login,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};
