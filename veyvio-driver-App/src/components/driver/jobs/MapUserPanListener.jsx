import { useMapEvents } from "react-leaflet";

export default function MapUserPanListener({ onUserPan }) {
  useMapEvents({
    dragstart: () => onUserPan?.(),
  });
  return null;
}
