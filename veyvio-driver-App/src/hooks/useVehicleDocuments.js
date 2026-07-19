import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  getVehicleDocumentsCache,
  setVehicleDocumentsCache,
  invalidateVehicleDocumentsCache,
} from "@/lib/vehicleDocumentsCache";

function initialState(vehicleId) {
  const cached = getVehicleDocumentsCache(vehicleId);
  return {
    vehicle: cached?.vehicle ?? null,
    documents: cached?.documents ?? [],
    loading: !cached?.vehicle,
  };
}

export function useVehicleDocuments(driver) {
  const vehicleId = driver?.assigned_vehicle_id;
  const [vehicle, setVehicle] = useState(() => initialState(vehicleId).vehicle);
  const [documents, setDocuments] = useState(() => initialState(vehicleId).documents);
  const [loading, setLoading] = useState(() => initialState(vehicleId).loading);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!vehicleId) {
        setVehicle(null);
        setDocuments([]);
        setLoading(false);
        return;
      }

      const cached = getVehicleDocumentsCache(vehicleId);
      if (cached?.vehicle && !force) {
        setVehicle(cached.vehicle);
        setDocuments(cached.documents ?? []);
        setLoading(false);
      } else if (!cached?.vehicle) {
        setLoading(true);
      }

      setError("");
      try {
        const vehicles = await base44.entities.Vehicle.filter({ id: vehicleId }, "-created_date", 1);
        const nextVehicle = vehicles[0] || null;
        setVehicle(nextVehicle);

        if (nextVehicle) {
          setLoading(false);
        }

        const docs = await base44.entities.VehicleDocument.filter(
          { vehicle_id: vehicleId },
          "-created_date",
          50
        ).catch(() => []);

        const nextDocuments = docs || [];
        setDocuments(nextDocuments);
        setVehicleDocumentsCache(vehicleId, {
          vehicle: nextVehicle,
          documents: nextDocuments,
        });
      } catch (err) {
        setError(err?.message || "Could not load vehicle details.");
      } finally {
        setLoading(false);
      }
    },
    [vehicleId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(async () => {
    invalidateVehicleDocumentsCache(vehicleId);
    await load({ force: true });
  }, [load, vehicleId]);

  return { vehicle, documents, loading, error, reload };
}
