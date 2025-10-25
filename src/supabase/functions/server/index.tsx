import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", cors());
app.use("*", logger(console.log));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Geocode a city name to coordinates
app.post("/make-server-62d7c2ee/geocode", async (c) => {
  try {
    const { city } = await c.req.json();

    if (!city) {
      return c.json(
        { error: "City parameter is required" },
        400,
      );
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "RoueDesActivites/1.0",
        },
      },
    );

    const data = await response.json();

    if (!data || data.length === 0) {
      return c.json({ error: "Location not found" }, 404);
    }

    return c.json({
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    });
  } catch (error) {
    console.error("Error in geocode endpoint:", error);
    return c.json({ error: `Geocoding error: ${error}` }, 500);
  }
});

// Reverse geocode coordinates to city name
app.post("/make-server-62d7c2ee/reverse-geocode", async (c) => {
  try {
    const { lat, lon } = await c.req.json();

    if (lat === undefined || lon === undefined) {
      return c.json(
        { error: "Latitude and longitude are required" },
        400,
      );
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          "User-Agent": "RoueDesActivites/1.0",
        },
      },
    );

    const data = await response.json();

    if (!data || !data.address) {
      return c.json({ error: "Location not found" }, 404);
    }

    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality ||
      "Unknown";

    return c.json({
      city,
      displayName: data.display_name,
    });
  } catch (error) {
    console.error("Error in reverse-geocode endpoint:", error);
    return c.json(
      { error: `Reverse geocoding error: ${error}` },
      500,
    );
  }
});

// Generate activities using Google Places API
app.post(
  "/make-server-62d7c2ee/generate-activities",
  async (c) => {
    try {
      const { location, request, lat, lon } =
        await c.req.json();

      if (!location || !request) {
        return c.json(
          { error: "Location and request are required" },
          400,
        );
      }

      const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

      if (!googleApiKey) {
        return c.json(
          {
            error:
              "Google Places API key not configured. Please add your GOOGLE_PLACES_API_KEY in the environment variables.",
          },
          500,
        );
      }

      // Map user request to Google Places types and keywords
      const searchConfig = mapRequestToPlacesQuery(request);
      
      // Use Text Search from Google Places API (New)
      const searchQuery = `${searchConfig.query} in ${location}`;
      
      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": googleApiKey,
            "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.types,places.priceLevel,places.rating,places.userRatingCount,places.location,places.businessStatus,places.photos,places.id",
          },
          body: JSON.stringify({
            textQuery: searchQuery,
            languageCode: "fr",
            maxResultCount: 12, // Request more to filter duplicates
            locationBias: lat && lon ? {
              circle: {
                center: { latitude: lat, longitude: lon },
                radius: 10000.0 // 10km radius
              }
            } : undefined
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Places API error response:", errorText);
        return c.json(
          {
            error: `Google Places API error: ${response.status} ${errorText}`,
          },
          response.status,
        );
      }

      const placesResponse = await response.json();
      
      if (!placesResponse.places || placesResponse.places.length === 0) {
        return c.json(
          { error: "No places found for this request. Try a different search." },
          404,
        );
      }

      // Convert Google Places to activities format
      const convertedActivities = placesResponse.places.map((place: any) => {
        // Get photo URLs from Google Places photos
        const photoUrls = place.photos?.slice(0, 5).map((photo: any) => {
          // Google Places Photo API URL
          const photoReference = photo.name; // Format: "places/{place_id}/photos/{photo_id}"
          return `https://places.googleapis.com/v1/${photoReference}/media?key=${googleApiKey}&maxHeightPx=800&maxWidthPx=1200`;
        }) || [];

        return {
          name: place.displayName?.text || "Lieu inconnu",
          category: getCategoryFromTypes(place.types, searchConfig.category),
          description: generateDescription(place, searchConfig.category),
          address: place.formattedAddress || `${location}`,
          price: getPriceFromLevel(place.priceLevel),
          distance: calculateDistance(lat, lon, place.location?.latitude, place.location?.longitude),
          icon: getIconForCategory(getCategoryFromTypes(place.types, searchConfig.category)),
          photos: photoUrls,
          placeId: place.id,
          lat: place.location?.latitude,
          lon: place.location?.longitude
        };
      });

      // Get existing activities to check for duplicates
      // RESET: Always clear activities before generating new ones
      await kv.set("activities:list", []);
      
      // No need to check for duplicates anymore since we reset
      const newActivities = convertedActivities
        .slice(0, 8) // Limit to 8 activities
        .map((a: any) => ({
          ...a,
          location,
          requestType: request, // Store the request type for filtering
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }));

      // Save new activities
      if (newActivities.length > 0) {
        await kv.set("activities:list", newActivities);
      }

      return c.json({
        activities: newActivities,
        total: newActivities.length,
        duplicatesFiltered: 0, // Always 0 since we reset
      });
    } catch (error) {
      console.error(
        "Error in generate-activities endpoint:",
        error,
      );
      return c.json(
        { error: `Activity generation error: ${error}` },
        500,
      );
    }
  },
);

// Helper functions for Google Places integration

function mapRequestToPlacesQuery(request: string): { query: string; category: string } {
  const requestLower = request.toLowerCase();
  
  // Map common French requests to search queries and categories
  if (requestLower.includes("restaurant") || requestLower.includes("manger") || requestLower.includes("gastronomie")) {
    return { query: "restaurants", category: "Gastronomie" };
  }
  if (requestLower.includes("musée") || requestLower.includes("museum")) {
    return { query: "museums", category: "Musée" };
  }
  if (requestLower.includes("parc") || requestLower.includes("jardin") || requestLower.includes("nature")) {
    return { query: "parks gardens", category: "Parc" };
  }
  if (requestLower.includes("monument") || requestLower.includes("historique")) {
    return { query: "historical landmarks monuments", category: "Monument" };
  }
  if (requestLower.includes("café") || requestLower.includes("bar")) {
    return { query: "cafes bars", category: "Vie Nocturne" };
  }
  if (requestLower.includes("shopping") || requestLower.includes("boutique") || requestLower.includes("magasin")) {
    return { query: "shopping malls stores", category: "Shopping" };
  }
  if (requestLower.includes("sport") || requestLower.includes("activité physique")) {
    return { query: "sports facilities gyms", category: "Sport" };
  }
  if (requestLower.includes("culture") || requestLower.includes("théâtre") || requestLower.includes("spectacle")) {
    return { query: "theaters cultural centers", category: "Culture" };
  }
  if (requestLower.includes("plein air") || requestLower.includes("outdoor")) {
    return { query: "outdoor activities hiking trails", category: "Nature" };
  }
  if (requestLower.includes("gratuit") || requestLower.includes("free")) {
    return { query: "free attractions parks museums", category: "Culture" };
  }
  
  // Default: use the request as-is
  return { query: request, category: "Divertissement" };
}

function getCategoryFromTypes(types: string[], defaultCategory: string): string {
  if (!types) return defaultCategory;
  
  const typeMap: { [key: string]: string } = {
    "museum": "Musée",
    "art_gallery": "Musée",
    "park": "Parc",
    "restaurant": "Gastronomie",
    "cafe": "Gastronomie",
    "bar": "Vie Nocturne",
    "night_club": "Vie Nocturne",
    "shopping_mall": "Shopping",
    "store": "Shopping",
    "tourist_attraction": "Monument",
    "church": "Monument",
    "stadium": "Sport",
    "gym": "Sport",
    "movie_theater": "Culture",
    "performing_arts_theater": "Culture",
    "amusement_park": "Divertissement",
    "aquarium": "Divertissement",
    "zoo": "Divertissement",
    "hiking_area": "Nature",
    "natural_feature": "Nature"
  };
  
  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }
  
  return defaultCategory;
}

function getPriceFromLevel(priceLevel: string | undefined): string {
  if (!priceLevel) return "Prix non disponible";
  
  const priceLevelMap: { [key: string]: string } = {
    "PRICE_LEVEL_FREE": "Gratuit",
    "PRICE_LEVEL_INEXPENSIVE": "€ (Économique)",
    "PRICE_LEVEL_MODERATE": "€€ (Modéré)",
    "PRICE_LEVEL_EXPENSIVE": "€€€ (Cher)",
    "PRICE_LEVEL_VERY_EXPENSIVE": "€€€€ (Très cher)"
  };
  
  return priceLevelMap[priceLevel] || "Prix non disponible";
}

function calculateDistance(lat1: number, lon1: number, lat2: number | undefined, lon2: number | undefined): string {
  if (!lat1 || !lon1 || !lat2 || !lon2) return "Distance inconnue";
  
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m du centre`;
  }
  return `${distance.toFixed(1)} km du centre`;
}

function generateDescription(place: any, category: string): string {
  const rating = place.rating ? `Note: ${place.rating}/5` : "";
  const ratingCount = place.userRatingCount ? ` (${place.userRatingCount} avis)` : "";
  const status = place.businessStatus === "OPERATIONAL" ? "Ouvert" : "";
  
  const descriptions: { [key: string]: string } = {
    "Musée": "Découvrez des collections fascinantes et enrichissez votre culture.",
    "Parc": "Un espace de détente idéal pour se ressourcer en pleine nature.",
    "Gastronomie": "Savourez une expérience culinaire inoubliable.",
    "Monument": "Plongez dans l'histoire et admirez l'architecture remarquable.",
    "Vie Nocturne": "Profitez d'une ambiance conviviale et animée.",
    "Shopping": "Trouvez vos coups de cœur dans un cadre agréable.",
    "Sport": "Restez actif et en forme dans cet espace dédié au bien-être.",
    "Culture": "Assistez à des spectacles et événements culturels mémorables.",
    "Nature": "Explorez des paysages magnifiques en plein air.",
    "Divertissement": "Passez un moment ludique et divertissant."
  };
  
  const baseDesc = descriptions[category] || "Découvrez ce lieu unique.";
  const ratingInfo = rating && ratingCount ? ` ${rating}${ratingCount}.` : "";
  
  return `${baseDesc}${ratingInfo}`;
}

function getIconForCategory(category: string): string {
  const iconMap: { [key: string]: string } = {
    "Musée": "🎨",
    "Parc": "🌳",
    "Gastronomie": "🍽️",
    "Monument": "⛪",
    "Vie Nocturne": "🍹",
    "Shopping": "🛍️",
    "Sport": "🏃",
    "Culture": "🎭",
    "Nature": "🌲",
    "Divertissement": "🎪"
  };
  
  return iconMap[category] || "📍";
}

// Get all activities (filtered by location and request type)
app.get("/make-server-62d7c2ee/activities", async (c) => {
  try {
    const location = c.req.query("location");
    const requestType = c.req.query("requestType");
    
    const allActivities = (await kv.get("activities:list")) || [];
    
    // Filter activities by location and requestType if provided
    let filteredActivities = allActivities;
    
    if (location) {
      filteredActivities = filteredActivities.filter(
        (activity: any) => activity.location === location
      );
    }
    
    if (requestType) {
      filteredActivities = filteredActivities.filter(
        (activity: any) => activity.requestType === requestType
      );
    }
    
    return c.json({ activities: filteredActivities });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return c.json(
      { error: `Failed to fetch activities: ${error}` },
      500,
    );
  }
});

// Get statistics
app.get("/make-server-62d7c2ee/stats", async (c) => {
  try {
    const activities = (await kv.get("activities:list")) || [];
    const spins = (await kv.get("stats:spins")) || 0;
    const freeActivities = activities.filter(
      (a: any) =>
        a.price && a.price.toLowerCase().includes("gratuit"),
    ).length;

    return c.json({
      totalActivities: activities.length,
      totalSpins: spins,
      freeActivities,
    });
  } catch (error) {
    console.error("Error in stats endpoint:", error);
    return c.json(
      { error: `Error fetching stats: ${error}` },
      500,
    );
  }
});

// Increment spin counter
app.post("/make-server-62d7c2ee/spin", async (c) => {
  try {
    const currentSpins = (await kv.get("stats:spins")) || 0;
    await kv.set("stats:spins", currentSpins + 1);
    return c.json({ spins: currentSpins + 1 });
  } catch (error) {
    console.error("Error in spin endpoint:", error);
    return c.json(
      { error: `Error incrementing spin: ${error}` },
      500,
    );
  }
});

// Reset data (for testing)
app.post("/make-server-62d7c2ee/reset", async (c) => {
  try {
    await kv.set("activities:list", []);
    await kv.set("stats:spins", 0);
    return c.json({ message: "Data reset successfully" });
  } catch (error) {
    console.error("Error in reset endpoint:", error);
    return c.json(
      { error: `Error resetting data: ${error}` },
      500,
    );
  }
});

Deno.serve(app.fetch);