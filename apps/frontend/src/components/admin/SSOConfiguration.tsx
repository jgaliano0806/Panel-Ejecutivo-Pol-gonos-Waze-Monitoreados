import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  EyeOff,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  Globe,
  Mail,
  Lock,
} from "lucide-react";

interface SSOProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  isConfigured: boolean;
  isEnabled: boolean;
  config: {
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    redirectUri?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
  };
  lastTested?: string;
  testResult?: "success" | "error" | null;
}

const SSOConfiguration: React.FC = () => {
  const [providers, setProviders] = useState<SSOProvider[]>([
    {
      id: "microsoft",
      name: "Microsoft Azure AD",
      icon: "microsoft",
      color: "#0078d4",
      isConfigured: false,
      isEnabled: false,
      config: {
        clientId: "",
        clientSecret: "",
        tenantId: "",
        redirectUri: `${window.location.origin}/auth/microsoft/callback`,
      },
    },
    {
      id: "google",
      name: "Google OAuth 2.0",
      icon: "google",
      color: "#4285f4",
      isConfigured: false,
      isEnabled: false,
      config: {
        clientId: "",
        clientSecret: "",
        redirectUri: `${window.location.origin}/auth/google/callback`,
      },
    },
  ]);

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const toggleSecretVisibility = (providerId: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  const updateProviderConfig = (
    providerId: string,
    field: string,
    value: string
  ) => {
    setProviders((prev) =>
      prev.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              config: { ...provider.config, [field]: value },
              isConfigured: isProviderConfigured({
                ...provider.config,
                [field]: value,
              }),
            }
          : provider
      )
    );
  };

  const isProviderConfigured = (config: any): boolean => {
    return !!(config.clientId && config.clientSecret);
  };

  const toggleProvider = (providerId: string) => {
    setProviders((prev) =>
      prev.map((provider) =>
        provider.id === providerId
          ? { ...provider, isEnabled: !provider.isEnabled }
          : provider
      )
    );
  };

  const testProvider = async (providerId: string) => {
    setTestingProvider(providerId);

    // Simular test de conexión
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simular resultado aleatorio para demo
    const success = Math.random() > 0.3;

    setProviders((prev) =>
      prev.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              lastTested: new Date().toISOString(),
              testResult: success ? "success" : "error",
            }
          : provider
      )
    );

    setTestingProvider(null);
  };

  const saveConfiguration = () => {
    // Aquí iría la lógica para guardar en backend
    alert("Configuración guardada exitosamente");
  };

  const getProviderIcon = (iconName: string) => {
    switch (iconName) {
      case "microsoft":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 1h10v10H1V1zm11 0h10v10H12V1zM1 12h10v10H1V12zm11 0h10v10H12V12z" />
          </svg>
        );
      case "google":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        );
      default:
        return <Shield size={24} />;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configuración de Autenticación SSO
        </h2>
        <p className="text-gray-600">
          Configura el inicio de sesión único con Microsoft Azure AD y Google
          OAuth 2.0
        </p>
      </div>

      {/* Información general */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-blue-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Información Importante
            </h3>
            <p className="text-sm text-blue-800">
              Para configurar SSO necesitarás registrar tu aplicación en los
              portales de desarrolladores de Microsoft y Google. Asegúrate de
              configurar correctamente las URLs de redireccionamiento.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {providers.map((provider) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-veltrix-card border border-gray-200 dark:border-veltrix-border rounded-lg overflow-hidden"
          >
            {/* Header del proveedor */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: provider.color + "20",
                      color: provider.color,
                    }}
                  >
                    {getProviderIcon(provider.icon)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Autenticación SSO con {provider.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {provider.isConfigured && (
                    <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                      Configurado
                    </span>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provider.isEnabled}
                      onChange={() => toggleProvider(provider.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={!provider.isConfigured}
                    />
                    <span className="text-sm text-gray-700">
                      {provider.isEnabled ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Configuración */}
            <div className="p-6 space-y-4">
              {provider.id === "microsoft" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Application (client) ID *
                      </label>
                      <input
                        type="text"
                        value={provider.config.clientId || ""}
                        onChange={(e) =>
                          updateProviderConfig(
                            provider.id,
                            "clientId",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                        placeholder="12345678-1234-1234-1234-123456789012"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Directory (tenant) ID *
                      </label>
                      <input
                        type="text"
                        value={provider.config.tenantId || ""}
                        onChange={(e) =>
                          updateProviderConfig(
                            provider.id,
                            "tenantId",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                        placeholder="87654321-4321-4321-4321-210987654321"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Secret *
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets[provider.id] ? "text" : "password"}
                        value={provider.config.clientSecret || ""}
                        onChange={(e) =>
                          updateProviderConfig(
                            provider.id,
                            "clientSecret",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                        placeholder="Tu client secret aquí"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility(provider.id)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecrets[provider.id] ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {provider.id === "google" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client ID *
                    </label>
                    <input
                      type="text"
                      value={provider.config.clientId || ""}
                      onChange={(e) =>
                        updateProviderConfig(
                          provider.id,
                          "clientId",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                      placeholder="123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Secret *
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets[provider.id] ? "text" : "password"}
                        value={provider.config.clientSecret || ""}
                        onChange={(e) =>
                          updateProviderConfig(
                            provider.id,
                            "clientSecret",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-veltrix-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-veltrix-bg dark:text-white"
                        placeholder="Tu client secret aquí"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility(provider.id)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecrets[provider.id] ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* URL de redireccionamiento (solo lectura) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Redirect URI (Configurar en {provider.name})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={provider.config.redirectUri || ""}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                  />
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        provider.config.redirectUri || ""
                      )
                    }
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Copiar al portapapeles"
                  >
                    📋
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Copia esta URL y configúrala en el portal de desarrolladores
                  de {provider.name}
                </p>
              </div>

              {/* Estado y acciones */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  {provider.lastTested && (
                    <div className="flex items-center gap-2">
                      {provider.testResult === "success" ? (
                        <CheckCircle className="text-green-600" size={16} />
                      ) : (
                        <XCircle className="text-red-600" size={16} />
                      )}
                      <span className="text-sm text-gray-600">
                        Última prueba:{" "}
                        {new Date(provider.lastTested).toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => testProvider(provider.id)}
                    disabled={
                      !provider.isConfigured || testingProvider === provider.id
                    }
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {testingProvider === provider.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
                        Probando...
                      </>
                    ) : (
                      <>
                        <TestTube size={16} />
                        Probar Conexión
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Instrucciones de configuración */}
      <div className="mt-8 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key size={20} />
            Instrucciones de Configuración
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Microsoft Azure AD:
              </h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>
                  Ve al{" "}
                  <a
                    href="https://portal.azure.com"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Azure Portal
                  </a>
                </li>
                <li>
                  Registra una nueva aplicación en "Azure Active Directory" →
                  "App registrations"
                </li>
                <li>
                  Copia el "Application (client) ID" y "Directory (tenant) ID"
                </li>
                <li>Genera un "Client secret" en "Certificates & secrets"</li>
                <li>Configura la redirect URI en "Authentication"</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Google OAuth:</h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>
                  Ve a la{" "}
                  <a
                    href="https://console.cloud.google.com"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Cloud Console
                  </a>
                </li>
                <li>Crea un nuevo proyecto o selecciona uno existente</li>
                <li>Habilita la API de Google+ API</li>
                <li>
                  Ve a "Credentials" → "Create Credentials" → "OAuth 2.0 Client
                  IDs"
                </li>
                <li>Copia el "Client ID" y "Client Secret"</li>
                <li>Configura las authorized redirect URIs</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={saveConfiguration}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
        >
          <Save size={18} />
          Guardar Configuración
        </button>
      </div>
    </div>
  );
};

export default SSOConfiguration;
