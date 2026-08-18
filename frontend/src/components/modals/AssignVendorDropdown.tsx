import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Search, Check, Users, Loader2, X } from "lucide-react";
import { Vendor, assignVendorsToRoles } from "@/api/resumeiq";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AssignVendorDropdownProps {
  open: boolean;
  onClose: () => void;
  vendors: Vendor[];
  selectedRoleIds: number[];
  onSuccess: () => void;
}

export const AssignVendorDropdown = ({
  open,
  onClose,
  vendors,
  selectedRoleIds,
  onSuccess,
}: AssignVendorDropdownProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);

  const filteredVendors = useMemo(() => {
    const lower = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(lower) ||
        v.company_name.toLowerCase().includes(lower)
    );
  }, [vendors, search]);

  const toggleVendor = (id: number) => {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const mutation = useMutation({
    mutationFn: () =>
      assignVendorsToRoles({
        vendor_ids: selectedVendorIds,
        role_ids: selectedRoleIds,
      }),
    onSuccess: () => {
      toast.success(`Successfully assigned ${selectedRoleIds.length} roles to ${selectedVendorIds.length} vendors`);
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setSelectedVendorIds([]);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.detail || "Failed to assign vendors");
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Job Roles to Vendors"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
          <span>Target Vendors</span>
          {selectedVendorIds.length > 0 && (
            <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {selectedVendorIds.length} selected
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search vendor name or agency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Vendor List */}
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar border border-border/50 rounded-xl divide-y divide-border/50">
          {filteredVendors.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-muted-foreground italic">No vendors match your search</p>
            </div>
          ) : (
            filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => toggleVendor(vendor.id)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-primary/[0.02] ${
                  selectedVendorIds.includes(vendor.id) ? "bg-primary/[0.04]" : ""
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center shrink-0 ${
                    selectedVendorIds.includes(vendor.id)
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {selectedVendorIds.includes(vendor.id) && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {vendor.company_name || vendor.name}
                  </p>
                  {vendor.company_name && (
                    <p className="text-[10px] text-muted-foreground truncate uppercase font-medium tracking-wide">
                      {vendor.company_name}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50 mt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-secondary transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={selectedVendorIds.length === 0 || mutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold shadow-sm hover:bg-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            Assign to {selectedVendorIds.length || ""} Vendors
          </button>
        </div>
      </div>
    </Modal>
  );
};
