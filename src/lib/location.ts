import { Geolocation } from "@capacitor/geolocation";

export async function getCurrentLocation() {
  const current = await Geolocation.checkPermissions();

  if (
    current.location !== "granted" &&
    current.coarseLocation !== "granted"
  ) {
    const requested = await Geolocation.requestPermissions();

    if (
      requested.location !== "granted" &&
      requested.coarseLocation !== "granted"
    ) {
      throw new Error("Location permission was denied.");
    }
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000,
    enableLocationFallback: true,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    heading: position.coords.heading,
    speed: position.coords.speed,
  };
}
