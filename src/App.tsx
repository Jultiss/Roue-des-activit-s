import { useState, useEffect } from 'react';
import { LocationPicker } from './components/LocationPicker';
import { ActivityGenerator } from './components/ActivityGenerator';
import { ActivityCardDetailed } from './components/ActivityCardDetailed';
import { Confetti } from './components/Confetti';
import { WheelSpinner } from './components/WheelSpinner';
import { Button } from './components/ui/button';
import { Sparkles } from 'lucide-react';
import { projectId, publicAnonKey } from './utils/supabase/info';

interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  price: string;
  distance: string;
  icon: string;
  photos?: string[];
  placeId?: string;
  lat?: number;
  lon?: number;
}

export default function App() {
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState(0);
  const [lon, setLon] = useState(0);
  const [currentRequest, setCurrentRequest] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchActivities = async () => {
    try {
      // Build query params for filtering
      const params = new URLSearchParams();
      if (location) {
        params.append('location', location);
      }
      if (currentRequest) {
        params.append('requestType', currentRequest);
      }
      
      const queryString = params.toString();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-62d7c2ee/activities${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      const data = await response.json();
      if (data.activities) {
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Refetch activities when location or currentRequest changes
  useEffect(() => {
    if (location) {
      fetchActivities();
    }
  }, [location, currentRequest]);

  const handleLocationChange = (newLocation: string, newLat: number, newLon: number) => {
    setLocation(newLocation);
    setLat(newLat);
    setLon(newLon);
    setCurrentRequest(''); // Reset request when location changes
    setSelectedActivity(null); // Clear selected activity
  };

  const handleActivitiesGenerated = () => {
    fetchActivities();
  };

  const handleSurpriseMe = () => {
    if (activities.length === 0) {
      alert('Veuillez d\'abord générer des activités !');
      return;
    }

    // Pick a random activity index
    const randomIndex = Math.floor(Math.random() * activities.length);
    setSelectedIndex(randomIndex);
    
    // Show the wheel
    setShowWheel(true);
  };

  const handleWheelComplete = () => {
    // Hide wheel
    setShowWheel(false);
    
    // Set the selected activity
    setSelectedActivity(activities[selectedIndex]);
    
    // Show confetti
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
    
    // Scroll to the activity card on mobile
    setTimeout(() => {
      const cardElement = document.getElementById('activity-card');
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-safe">
      <Confetti active={showConfetti} />
      <WheelSpinner 
        activities={activities}
        selectedIndex={selectedIndex}
        onSpinComplete={handleWheelComplete}
        isVisible={showWheel}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 pt-safe">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
            🎡 La Roue des Activités
          </h1>
          <p className="text-gray-600 text-sm sm:text-base px-4">
            Découvrez des activités locales de manière ludique !
          </p>
        </div>

        {/* Location Picker */}
        <LocationPicker onLocationChange={handleLocationChange} />

        {/* Activity Generator */}
        <ActivityGenerator
          location={location}
          lat={lat}
          lon={lon}
          onActivitiesGenerated={handleActivitiesGenerated}
          onRequestChange={setCurrentRequest}
        />

        {/* Surprise Me Button */}
        {activities.length > 0 && (
          <div className="flex justify-center mb-6 sm:mb-8 sticky top-4 z-10 px-4">
            <Button
              onClick={handleSurpriseMe}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 sm:px-8 py-6 sm:py-7 text-lg sm:text-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 w-full sm:w-auto rounded-2xl"
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 animate-pulse" />
              Surprends-moi !
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3 animate-pulse" />
            </Button>
          </div>
        )}

        {/* Selected Activity Card */}
        {selectedActivity && (
          <div id="activity-card" className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ActivityCardDetailed activity={selectedActivity} />
          </div>
        )}

        {/* Empty State */}
        {!selectedActivity && activities.length > 0 && (
          <div className="text-center py-12 sm:py-20 px-4">
            <div className="text-5xl sm:text-6xl mb-4">🎯</div>
            <h2 className="text-lg sm:text-xl text-gray-600 mb-2">Prêt pour une nouvelle aventure ?</h2>
            <p className="text-sm sm:text-base text-gray-500">Cliquez sur "Surprends-moi !" pour découvrir une activité</p>
          </div>
        )}

        {/* No Activities State */}
        {activities.length === 0 && location && (
          <div className="text-center py-12 sm:py-20 px-4">
            <div className="text-5xl sm:text-6xl mb-4">🗺️</div>
            <h2 className="text-lg sm:text-xl text-gray-600 mb-2">Aucune activité disponible</h2>
            <p className="text-sm sm:text-base text-gray-500">Générez des activités pour commencer !</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center text-gray-500 text-xs sm:text-sm px-4 pb-safe">
          <p>✨ Laissez-vous surprendre et découvrez votre prochaine aventure locale !</p>
        </div>
      </div>
    </div>
  );
}
