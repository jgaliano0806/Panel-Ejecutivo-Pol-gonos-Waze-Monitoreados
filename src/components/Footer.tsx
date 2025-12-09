import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-white border-t border-gray-200 mt-8">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Leyenda de colores */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Leyenda de Estados</h3>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded bg-success"></div>
                                <span className="text-sm text-gray-600">Fluido - Sin incidentes o congestión baja</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded bg-warning"></div>
                                <span className="text-sm text-gray-600">Moderado - Alertas leves o congestión media</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded bg-danger"></div>
                                <span className="text-sm text-gray-600">Crítico - Incidente severo o congestión alta</span>
                            </div>
                        </div>
                    </div>

                    {/* Fuente de datos */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Fuente de Datos</h3>
                        <div className="flex items-start space-x-2">
                            <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm text-gray-600">
                                    Datos provenientes de{' '}
                                    <span className="font-medium text-gray-900">Waze for Cities Partner Hub</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Actualización automática cada 30 segundos
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Información adicional */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Monitoreo</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>• 40 polígonos configurados</p>
                            <p>• Alertas en tiempo real</p>
                            <p>• Datos de tráfico y congestión</p>
                            <p>• Análisis de severidad automático</p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-center text-xs text-gray-500">
                        © {new Date().getFullYear()} Panel Ejecutivo Waze. Sistema de monitoreo de tránsito en tiempo real.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
