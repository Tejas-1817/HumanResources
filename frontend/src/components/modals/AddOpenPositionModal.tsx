import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/Modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanies, createJobRole } from "@/api/resumeiq";
import { toast } from "sonner";
import { BriefcaseBusiness, Loader2 } from "lucide-react";

const formSchema = z.object({
  company_id: z.string().min(1, "Company is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  skills: z.string().min(1, "Skills are required"),
  experience_required: z.string().optional(),
  work_mode: z.string().min(1, "Employment type is required"),
  location: z.string().min(1, "Location is required"),
  positions_required: z.string().min(1, "Number of openings is required"),
  salary_range: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.string().default("open"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddOpenPositionModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddOpenPositionModal = ({ open, onClose }: AddOpenPositionModalProps) => {
  const queryClient = useQueryClient();
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "open",
      work_mode: "on-site",
      positions_required: "1",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      return createJobRole({
        company_id: parseInt(values.company_id),
        title: values.title,
        description: `Skills: ${values.skills}\n\n${values.description}${values.salary_range ? `\n\nSalary Range: ${values.salary_range}` : ""}`,
        status: values.status,
        positions_required: parseInt(values.positions_required),
        location: values.location,
        work_mode: values.work_mode,
        experience_required: values.experience_required ? parseInt(values.experience_required) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      toast.success("Job role created successfully");
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to create job role");
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Open Position">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company</label>
            <select
              {...register("company_id")}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {errors.company_id && <p className="text-[10px] text-destructive font-bold">{errors.company_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Title</label>
            <input
              {...register("title")}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
            {errors.title && <p className="text-[10px] text-destructive font-bold">{errors.title.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Skills Required</label>
          <input
            {...register("skills")}
            placeholder="e.g. React, TypeScript, Tailwind"
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
          {errors.skills && <p className="text-[10px] text-destructive font-bold">{errors.skills.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Experience (Years)</label>
            <input
              type="number"
              {...register("experience_required")}
              placeholder="e.g. 5"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Employment Type</label>
            <select
              {...register("work_mode")}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            >
              <option value="on-site">On-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</label>
            <input
              {...register("location")}
              placeholder="e.g. New York, NY"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
            {errors.location && <p className="text-[10px] text-destructive font-bold">{errors.location.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Openings</label>
            <input
              type="number"
              {...register("positions_required")}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="space-y-1.5 col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Salary Range</label>
            <input
              {...register("salary_range")}
              placeholder="e.g. $120k - $150k"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Description</label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Describe the role and responsibilities..."
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none"
          />
          {errors.description && <p className="text-[10px] text-destructive font-bold">{errors.description.message}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-secondary transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <BriefcaseBusiness className="w-4 h-4" />
                Add Open Position
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
