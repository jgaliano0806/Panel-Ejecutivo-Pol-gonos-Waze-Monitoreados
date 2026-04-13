import React from "react";
import { isAudioUnlocked } from "@/lib/tts-utils";
import { activateSoundAlertsFromUserGesture } from "@/utils/audioAlerts";

interface HeaderProps {
    lastUpdate: Date;
}

const SOUND_ALERTS_LS = "panel_sound_alerts_unlocked";

const Header: React.FC<HeaderProps> = ({ lastUpdate }) => {
    const [soundAlertsActive, setSoundAlertsActive] = React.useState(() => {
        if (typeof window === "undefined") return false;
        return (
            isAudioUnlocked() ||
            window.localStorage.getItem(SOUND_ALERTS_LS) === "true"
        );
    });

    React.useEffect(() => {
        const sync = () => {
            const on =
                isAudioUnlocked() ||
                (typeof window !== "undefined" &&
                    window.localStorage.getItem(SOUND_ALERTS_LS) === "true");
            setSoundAlertsActive(on);
        };
        window.addEventListener("tts-unlocked", sync);
        sync();
        return () => window.removeEventListener("tts-unlocked", sync);
    }, []);

    const handleActivateSoundAlerts = async () => {
        const ok = await activateSoundAlertsFromUserGesture();
        if (ok && typeof window !== "undefined") {
            window.localStorage.setItem(SOUND_ALERTS_LS, "true");
        }
        setSoundAlertsActive(ok || isAudioUnlocked());
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'America/Argentina/Buenos_Aires',
        });
    };

    return (
        <header className="bg-white border-b-4 border-yellow-400 px-6 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    {/* Logo y título */}
                    <div className="flex items-center space-x-4">
                        {/* Logo Oficial Caminos de las Sierras */}
                        <div className="h-16 w-auto flex items-center justify-center">
                            <img
                                src="/logo_cs.png"
                                alt="Caminos de las Sierras"
                                className="h-full w-auto object-contain"
                            />
                        </div>
                        <div>
                            {/* Título eliminado por redundancia con logo */}
                            <p className="text-lg text-primary-700 font-bold mt-1 tracking-wide border-l-2 border-yellow-400 pl-3 ml-2">
                                Panel de Control Inteligente
                            </p>
                        </div>
                    </div>

                    {/* Metadata y estado */}
                    <div className="flex items-center space-x-4">
                        <button
                            type="button"
                            onClick={handleActivateSoundAlerts}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${
                                soundAlertsActive
                                    ? "bg-green-100 border-green-500 text-green-900"
                                    : "bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100"
                            }`}
                        >
                            {soundAlertsActive
                                ? "Alertas sonoras activas"
                                : "Activar Alertas Sonoras"}
                        </button>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Última actualización</p>
                            <p className="text-sm font-medium text-gray-900">
                                {formatTime(lastUpdate)}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                En Vivo
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                v1.0
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
