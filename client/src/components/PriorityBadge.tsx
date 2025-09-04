import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export default function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
      case "urgent":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "priority-medium";
    }
  };

  const getDisplayText = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1) + " Priority";
  };

  return (
    <span
      className={cn(
        "text-xs px-2 py-1 rounded-full font-medium",
        getPriorityClass(priority),
        className
      )}
    >
      {getDisplayText(priority)}
    </span>
  );
}
