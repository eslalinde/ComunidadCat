"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { routes } from "@/lib/routes";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <h2 className="text-2xl font-bold mb-2 text-gray-900">
          Algo salió mal
        </h2>
        <p className="text-gray-500 mb-6">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al
          inicio.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            onClick={() => reset()}
          >
            <RotateCcw className="w-4 h-4" />
            Reintentar
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B3A6F] text-white font-medium rounded-lg hover:bg-[#15305C] transition-colors"
            onClick={() => router.push(routes.home)}
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        </div>

        {process.env.NODE_ENV === "development" && error.message && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-500">
              Detalles del error (solo desarrollo)
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
