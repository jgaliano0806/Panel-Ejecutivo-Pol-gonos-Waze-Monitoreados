import React from "react";
import { useRelativeTime } from "../hooks/useRelativeTime";
import { WazeIcon } from "./WazeIcon";

interface RelativeTimeProps {
  timestamp: string | number | Date;
}

export const RelativeTime: React.FC<RelativeTimeProps> = ({ timestamp }) => {
  // Asegurar que pasamos un objeto Date válido al hook
  const dateObj = new Date(timestamp);
  const minutesAgo = useRelativeTime(dateObj);

  return (
    <div className="text-sm flex items-center gap-1">
      <WazeIcon type="time" uiIcon size="sm" className="inline-block" />
      <span>hace {minutesAgo} min</span>
    </div>
  );
};

export default RelativeTime;
