import React from "react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ThumbsUp, ShieldCheck, AlertTriangle } from "lucide-react";

interface IncidentImpactCardProps {
  data: {
    uuid: string;
    type: string;
    subtype: string;
    description: string;
    street: string;
    score: number;
    confidence: number;
    reliability: number;
    jamLevel: number;
  };
}

export const IncidentImpactCard: React.FC<IncidentImpactCardProps> = ({
  data,
}) => {
  const getScoreColor = (score: number) => {
    if (score > 15) return "text-red-500";
    if (score > 10) return "text-orange-500";
    return "text-yellow-500";
  };

  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500 bg-white dark:bg-veltrix-card dark:border-veltrix-border">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge
            variant={data.jamLevel > 3 ? "danger" : "default"}
            className="mb-2"
          >
            Nivel Impacto: {data.score}
          </Badge>
          <span className="text-xs text-gray-500 dark:text-veltrix-muted font-mono">
            {data.uuid.slice(0, 8)}
          </span>
        </div>
        <CardTitle className="text-lg font-bold flex items-center gap-2 dark:text-veltrix-text">
          <AlertTriangle className={getScoreColor(data.score)} />
          {data.description}
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-veltrix-muted truncate">
          {data.street}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {/* Confianza */}
          <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
            <ThumbsUp className="w-4 h-4 mb-1 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-veltrix-muted">
              Confianza
            </span>
            <span className="font-bold dark:text-veltrix-text">
              {data.confidence}/10
            </span>
          </div>

          {/* Fiabilidad */}
          <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
            <ShieldCheck className="w-4 h-4 mb-1 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-veltrix-muted">
              Fiabilidad
            </span>
            <span className="font-bold dark:text-veltrix-text">
              {data.reliability}/10
            </span>
          </div>

          {/* Atasco */}
          <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
            <div
              className={`w-4 h-4 rounded-full mb-1 ${
                data.jamLevel > 3 ? "bg-red-500" : "bg-gray-300"
              }`}
            />
            <span className="text-xs text-gray-500 dark:text-veltrix-muted">
              Congestión
            </span>
            <span className="font-bold dark:text-veltrix-text">
              Nvl {data.jamLevel}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
