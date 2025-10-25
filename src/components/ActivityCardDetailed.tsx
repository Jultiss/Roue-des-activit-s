import { useState, useRef, useEffect } from 'react';
import { MapPin, DollarSign, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

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

interface ActivityCardDetailedProps {
  activity: Activity;
}

export function ActivityCardDetailed({ activity }: ActivityCardDetailedProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Google Maps link (opens in new tab)
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.address)}`;

  // Use real photos from Google Places or fallback to Unsplash
  const photos = activity.photos && activity.photos.length > 0
    ? activity.photos
    : [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop'
      ];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextPhoto();
    }
    if (isRightSwipe) {
      prevPhoto();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <Card className="overflow-hidden mx-auto shadow-2xl rounded-3xl">
      {/* Photo Carousel */}
      <div 
        className="relative h-64 sm:h-80 lg:h-96 bg-gray-100 group overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={carouselRef}
      >
        <div className="relative h-full">
          <img
            src={photos[currentPhotoIndex]}
            alt={`${activity.name} - Photo ${currentPhotoIndex + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop';
            }}
          />
          
          {/* Navigation Arrows - Hidden on mobile, shown on desktop */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={prevPhoto}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={nextPhoto}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>
        
        {/* Photo indicator dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 sm:gap-2">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPhotoIndex(index)}
                className={`h-1.5 sm:h-2 rounded-full transition-all ${
                  index === currentPhotoIndex 
                    ? 'bg-white w-4 sm:w-6' 
                    : 'bg-white/60 w-1.5 sm:w-2 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}

        {/* Photo counter */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-black/60 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm backdrop-blur-sm">
          {currentPhotoIndex + 1} / {photos.length}
        </div>

        {/* Swipe indicator for mobile */}
        {photos.length > 1 && (
          <div className="sm:hidden absolute bottom-12 left-1/2 transform -translate-x-1/2 text-white/60 text-xs backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
            ← Glissez →
          </div>
        )}
      </div>

      {/* Activity Details */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="text-3xl sm:text-4xl">{activity.icon}</span>
              <span className="text-xl sm:text-2xl lg:text-3xl leading-tight">{activity.name}</span>
            </h2>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {activity.category}
            </Badge>
          </div>
        </div>

        <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg leading-relaxed">
          {activity.description}
        </p>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-700">{activity.distance}</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-green-50 rounded-xl border border-green-100">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-700">{activity.price}</span>
          </div>
        </div>

        {/* Address with clickable link */}
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 active:bg-purple-200 transition-colors mb-4 sm:mb-6 group"
        >
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-gray-700 flex-1 leading-snug">{activity.address}</span>
          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
        </a>

        {/* Google Maps Embed */}
        {activity.lat && activity.lon && (
          <div className="rounded-xl sm:rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg h-64 sm:h-80 lg:h-96">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(activity.address)}&zoom=15`}
              allowFullScreen
              loading="lazy"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
