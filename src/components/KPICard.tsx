import React, { memo } from 'react';

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
        value: number;
        label: string;
        isPositive?: boolean;
    };
    icon: React.ReactNode;
    iconBgColor: string;
}

/**
 * Componente KPICard individual - Memoizado para evitar re-renders innecesarios
 */
const KPICard: React.FC<KPICardProps> = memo(({
    title,
    value,
    subtitle,
    trend,
    icon,
    iconBgColor
}) => {
    return (
        <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                        {value}
                    </p>
                    {trend && trend.value !== 0 && (
                        <div className="flex items-center mt-2">
                            {trend.isPositive ? (
                                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-danger" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                            <span className={`text-xs ml-1 ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
                                {Math.abs(trend.value)}{trend.label}
                            </span>
                        </div>
                    )}
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-2">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
        </div>
    );
});

KPICard.displayName = 'KPICard';

export default KPICard;


