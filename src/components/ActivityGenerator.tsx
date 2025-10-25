import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ActivityGeneratorProps {
  location: string;
  lat: number;
  lon: number;
  onActivitiesGenerated: () => void;
  onRequestChange: (request: string) => void;
}

export function ActivityGenerator({ location, lat, lon, onActivitiesGenerated, onRequestChange }: ActivityGeneratorProps) {
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!request.trim()) {
      alert('Veuillez entrer une demande');
      return;
    }
    
    if (!location) {
      alert('Veuillez d\'abord sélectionner une localisation');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-62d7c2ee/generate-activities`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            location,
            request,
            lat,
            lon
          })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error('Activity generation error:', data.error);
        alert(`Erreur: ${data.error}`);
      } else {
        onRequestChange(request); // Update current request filter
        setRequest('');
        onActivitiesGenerated();
        
        alert(`✨ ${data.total} activités générées avec succès !`);
      }
    } catch (error) {
      console.error('Error generating activities:', error);
      alert('Erreur lors de la génération des activités');
    } finally {
      setLoading(false);
    }
  };

  const quickSuggestions = [
    'restaurants typiques',
    'musées gratuits',
    'activités en plein air',
    'bars avec terrasse',
    'lieux Instagrammables',
    'parcs et jardins'
  ];

  return (
    <div className="bg-white rounded-2xl sm:rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
      <h2 className="mb-3 sm:mb-4 flex items-center gap-2 text-lg sm:text-xl">
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        Générer des activités avec l'IA
      </h2>
      
      <form onSubmit={handleGenerate} className="mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="Ex: restaurants typiques, musées..."
            value={request}
            onChange={(e) => {
              setRequest(e.target.value);
              onRequestChange(e.target.value);
            }}
            className="flex-1 h-12 sm:h-10 rounded-xl text-base sm:text-sm"
            disabled={!location || loading}
          />
          <Button 
            type="submit" 
            disabled={!location || loading || !request.trim()}
            className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 h-12 sm:h-10 px-4 sm:px-6 rounded-xl w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Générer
              </>
            )}
          </Button>
        </div>
      </form>
      
      <div className="flex flex-wrap gap-2">
        <p className="w-full text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Suggestions rapides :</p>
        {quickSuggestions.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            onClick={() => setRequest(suggestion)}
            disabled={!location || loading}
            className="text-xs rounded-lg h-8 sm:h-9"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}