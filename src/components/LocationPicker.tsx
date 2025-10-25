import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LocationPickerProps {
  onLocationChange: (location: string, lat: number, lon: number) => void;
}

export function LocationPicker({ onLocationChange }: LocationPickerProps) {
  const [searchCity, setSearchCity] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGeolocate = async () => {
    setLoading(true);
    try {
      if (!navigator.geolocation) {
        alert("La géolocalisation n'est pas supportée par votre navigateur");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-62d7c2ee/reverse-geocode`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({ lat: latitude, lon: longitude })
              }
            );

            const data = await response.json();
            
            if (data.error) {
              console.error('Reverse geocoding error:', data.error);
              alert('Erreur lors de la récupération de votre position');
            } else {
              setCurrentLocation(data.city);
              onLocationChange(data.city, latitude, longitude);
            }
          } catch (error) {
            console.error('Error in reverse geocoding:', error);
            alert('Erreur lors de la récupération de votre ville');
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error.message, 'Code:', error.code);
          let errorMessage = "Impossible d'obtenir votre position. ";
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "Veuillez autoriser la géolocalisation dans les paramètres de votre navigateur.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Position non disponible. Veuillez réessayer.";
              break;
            case error.TIMEOUT:
              errorMessage += "La demande a expiré. Veuillez réessayer.";
              break;
            default:
              errorMessage += "Une erreur s'est produite.";
          }
          
          alert(errorMessage);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error('Error in geolocation:', error);
      alert("Erreur lors de l'accès à la géolocalisation. Veuillez utiliser la recherche manuelle.");
      setLoading(false);
    }
  };

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchCity.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-62d7c2ee/geocode`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ city: searchCity })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error('Geocoding error:', data.error);
        alert('Ville non trouvée. Veuillez réessayer.');
      } else {
        setCurrentLocation(searchCity);
        onLocationChange(searchCity, data.lat, data.lon);
      }
    } catch (error) {
      console.error('Error in city search:', error);
      alert('Erreur lors de la recherche de la ville');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
      <h2 className="mb-3 sm:mb-4 flex items-center gap-2 text-lg sm:text-xl">
        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        Localisation
      </h2>
      
      {currentLocation && (
        <div className="mb-3 sm:mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-blue-800 text-sm sm:text-base">
            📍 <span>{currentLocation}</span>
          </p>
        </div>
      )}
      
      <div className="flex flex-col gap-3 mb-3 sm:mb-4">
        <Button
          onClick={handleGeolocate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 h-12 sm:h-auto text-base sm:text-sm rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
          ) : (
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          )}
          Me géolocaliser
        </Button>
      </div>
      
      <div className="relative">
        <p className="text-center text-gray-500 my-3 text-xs sm:text-sm">ou</p>
      </div>
      
      <form onSubmit={handleSearchCity} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher une ville..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="pl-10 h-12 sm:h-10 rounded-xl text-base sm:text-sm"
          />
        </div>
        <Button 
          type="submit" 
          disabled={loading || !searchCity.trim()}
          className="h-12 sm:h-10 px-4 sm:px-6 rounded-xl"
        >
          Rechercher
        </Button>
      </form>
    </div>
  );
}