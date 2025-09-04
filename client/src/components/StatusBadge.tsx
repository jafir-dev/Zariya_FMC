import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "status-badge-open";
      case "assigned":
        return "status-badge-assigned";
      case "in_progress":
        return "status-badge-in-progress";
      case "completed":
        return "status-badge-completed";
      case "closed":
        return "status-badge-closed";
      case "cancelled":
        return "status-badge-cancelled";
      default:
        return "status-badge-open";
    }
  };

  const getDisplayText = (status: string) => {
    switch (status.toLowerCase()) {
      case "in_progress":
        return "In Progress";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <span
      className={cn(
        "text-xs px-2 py-1 rounded-full font-medium",
        getStatusClass(status),
        className
      )}
    >
      {getDisplayText(status)}
    </span>
  );
}
