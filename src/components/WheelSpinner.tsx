import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Activity {
  id: string;
  name: string;
  category: string;
  icon: string;
}

interface WheelSpinnerProps {
  activities: Activity[];
  selectedIndex: number;
  onSpinComplete: () => void;
  isVisible: boolean;
}

const COLORS = [
  '#FF6B6B', // Rouge
  '#4ECDC4', // Turquoise
  '#FFE66D', // Jaune
  '#95E1D3', // Vert menthe
  '#F38181', // Rose
  '#AA96DA', // Violet
  '#FCBAD3', // Rose clair
  '#A8D8EA', // Bleu clair
];

export function WheelSpinner({ activities, selectedIndex, onSpinComplete, isVisible }: WheelSpinnerProps) {
  const [rotation, setRotation] = useState(0);
  
  useEffect(() => {
    if (isVisible && activities.length > 0) {
      // Calculate the final rotation to land on the selected segment
      const segmentAngle = 360 / activities.length;
      const targetAngle = 360 - (selectedIndex * segmentAngle) - (segmentAngle / 2);
      
      // Add multiple full rotations (5 tours complets = 1800°)
      const finalRotation = 1800 + targetAngle;
      
      setRotation(finalRotation);
      
      // Trigger completion after animation (4 seconds)
      setTimeout(() => {
        onSpinComplete();
      }, 4000);
    }
  }, [isVisible, selectedIndex, activities.length, onSpinComplete]);

  if (!isVisible || activities.length === 0) return null;

  const segmentAngle = 360 / activities.length;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900"
        >
          {/* Titre */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-8 sm:top-16 text-center px-4"
          >
            <h2 className="text-3xl sm:text-5xl lg:text-6xl text-white mb-2">
              🎡 La Roue Tourne...
            </h2>
            <p className="text-white/80 text-sm sm:text-lg">
              Découvrez votre prochaine aventure !
            </p>
          </motion.div>

          {/* Wheel Container */}
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px]">
            {/* Triangle pointer at top */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 z-20"
            >
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-white drop-shadow-2xl" />
            </motion.div>

            {/* Wheel */}
            <motion.div
              className="relative w-full h-full"
              initial={{ rotate: 0, scale: 0 }}
              animate={{ 
                rotate: rotation,
                scale: 1
              }}
              transition={{
                rotate: {
                  duration: 4,
                  ease: [0.25, 0.1, 0.25, 1], // Ease-in-out custom
                },
                scale: {
                  duration: 0.5,
                  ease: "backOut"
                }
              }}
            >
              {/* Center Circle */}
              <div className="absolute inset-0 rounded-full shadow-2xl overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  {activities.map((activity, index) => {
                    const startAngle = index * segmentAngle - 90;
                    const endAngle = (index + 1) * segmentAngle - 90;
                    
                    const startX = 100 + 100 * Math.cos((startAngle * Math.PI) / 180);
                    const startY = 100 + 100 * Math.sin((startAngle * Math.PI) / 180);
                    const endX = 100 + 100 * Math.cos((endAngle * Math.PI) / 180);
                    const endY = 100 + 100 * Math.sin((endAngle * Math.PI) / 180);
                    
                    const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                    
                    const path = `
                      M 100 100
                      L ${startX} ${startY}
                      A 100 100 0 ${largeArcFlag} 1 ${endX} ${endY}
                      Z
                    `;

                    // Calculate text position
                    const textAngle = startAngle + segmentAngle / 2;
                    const textRadius = 65;
                    const textX = 100 + textRadius * Math.cos((textAngle * Math.PI) / 180);
                    const textY = 100 + textRadius * Math.sin((textAngle * Math.PI) / 180);

                    return (
                      <g key={activity.id}>
                        {/* Segment */}
                        <path
                          d={path}
                          fill={COLORS[index % COLORS.length]}
                          stroke="white"
                          strokeWidth="2"
                        />
                        
                        {/* Icon */}
                        <text
                          x={textX}
                          y={textY}
                          fontSize="24"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                        >
                          {activity.icon}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white shadow-2xl flex items-center justify-center border-4 border-yellow-400">
                  <span className="text-2xl sm:text-3xl">✨</span>
                </div>
              </div>
            </motion.div>

            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-radial from-white/20 to-transparent blur-xl -z-10" />
          </div>

          {/* Loading text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 sm:bottom-16 text-center px-4"
          >
            <div className="flex items-center gap-2 text-white/80">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-2xl"
              >
                ⏳
              </motion.span>
              <p className="text-sm sm:text-lg">Sélection en cours...</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
