import React from 'react';
import { motion } from 'framer-motion';
import { Info, Database, Activity } from 'lucide-react';
import { COMPANY_INFO, UI_TEXTS, REFRESH_INTERVALS } from '../config/constants';

const Footer: React.FC = () => {
    // Convertir ms a segundos para mostrar
    const refreshSeconds = REFRESH_INTERVALS.realTimeData / 1000;
    return (
        <footer className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t-4 border-yellow-400 mt-12 overflow-hidden">
            {/* Patrón decorativo de fondo */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                    backgroundSize: '32px 32px'
                }} />
            </div>

            <div className="relative max-w-[1900px] mx-auto px-8 py-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Leyenda de colores */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        viewport={{ once: true }}
                        className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-2 shadow-lg">
                                <Info className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-base font-black text-white">Leyenda de Estados</h3>
                        </div>
                        <div className="space-y-3">
                            <motion.div
                                className="flex items-center gap-3 bg-white/5 rounded-lg p-2"
                                whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30"></div>
                                <span className="text-sm text-gray-200 font-medium">Fluido - Tráfico normal</span>
                            </motion.div>
                            <motion.div
                                className="flex items-center gap-3 bg-white/5 rounded-lg p-2"
                                whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/30"></div>
                                <span className="text-sm text-gray-200 font-medium">Moderado - Congestión leve</span>
                            </motion.div>
                            <motion.div
                                className="flex items-center gap-3 bg-white/5 rounded-lg p-2"
                                whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/30"></div>
                                <span className="text-sm text-gray-200 font-medium">Crítico - Incidente severo</span>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Fuente de datos */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        viewport={{ once: true }}
                        className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2 shadow-lg">
                                <Database className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-base font-black text-white">Fuente de Datos</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="bg-white/5 rounded-lg p-3">
                                <p className="text-sm text-gray-200 font-medium">
                                    Datos en tiempo real desde{' '}
                                    <span className="font-black text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                        Waze for Cities
                                    </span>
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <motion.div
                                        className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                                        animate={{
                                            scale: [1, 1.3, 1],
                                            opacity: [1, 0.6, 1]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <p className="text-xs text-green-400 font-bold">
                                        Actualización cada {refreshSeconds} segundos
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Información adicional */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        viewport={{ once: true }}
                        className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg p-2 shadow-lg">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-base font-black text-white">Sistema de Monitoreo</h3>
                        </div>
                        <div className="space-y-2">
                            {UI_TEXTS.footer.systemFeatures.map((item, index) => (
                                <motion.div
                                    key={index}
                                    className="flex items-center gap-2 text-sm text-gray-200 bg-white/5 rounded-lg p-2"
                                    whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                >
                                    <div className="w-1.5 h-1.5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/50"></div>
                                    <span className="font-medium">{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Copyright y detalles */}
                <motion.div
                    className="mt-8 pt-8 border-t-2 border-white/10"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    viewport={{ once: true }}
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-400 font-medium">
                            © {new Date().getFullYear()} <span className="font-black text-white">{COMPANY_INFO.name}</span> - {UI_TEXTS.appSubtitle}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>Desarrollado por</span>
                            <span className="font-black text-white">GED</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </footer>
    );
};

export default Footer;
