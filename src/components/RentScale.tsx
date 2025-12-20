interface RentScaleProps {
  minRent: number;
  referenceRent: number;
  maxRent: number;
  currentRent: number;
}

export function RentScale({ minRent, referenceRent, maxRent, currentRent }: RentScaleProps) {
  // Calcul de l'échelle adaptative
  const rentRange = maxRent - minRent;
  const padding = rentRange * 0.15;
  const scaleMin = Math.max(0, minRent - padding);
  const scaleMax = Math.max(maxRent, currentRent) + padding;
  const totalRange = scaleMax - scaleMin;

  // Fonction pour convertir une valeur en pourcentage de position (du bas)
  const getPosition = (value: number) => {
    return ((value - scaleMin) / totalRange) * 100;
  };

  const isCompliant = currentRent <= maxRent;
  const exceedsMax = currentRent > maxRent;

  // Positions des différents seuils
  const minPos = getPosition(minRent);
  const refPos = getPosition(referenceRent);
  const maxPos = getPosition(maxRent);
  const currentPos = getPosition(currentRent);

  const formatRent = (value: number) => {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  return (
    <div className="w-full py-4">
      <div className="relative h-[300px] flex">
        {/* Axe vertical central */}
        <div className="relative w-full">
          {/* Zone conforme (vert) - entre minoré et majoré */}
          <div 
            className="absolute left-0 right-0 bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500"
            style={{ 
              bottom: `${minPos}%`, 
              height: `${maxPos - minPos}%`
            }}
          />
          
          {/* Zone hors cadre (rouge) - au-dessus du majoré si dépassement */}
          {exceedsMax && (
            <div 
              className="absolute left-0 right-0 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500"
              style={{ 
                bottom: `${maxPos}%`, 
                height: `${currentPos - maxPos}%`
              }}
            />
          )}

          {/* Marqueur - Loyer minoré */}
          <div 
            className="absolute left-0 right-0 flex items-center"
            style={{ bottom: `${minPos}%`, transform: 'translateY(50%)' }}
          >
            <div className="h-[2px] w-8 bg-muted-foreground/50" />
            <div className="ml-2 flex flex-col">
              <span className="text-xs text-muted-foreground">Loyer minoré</span>
              <span className="text-sm font-medium">{formatRent(minRent)}</span>
            </div>
          </div>

          {/* Marqueur - Loyer de référence */}
          <div 
            className="absolute left-0 right-0 flex items-center"
            style={{ bottom: `${refPos}%`, transform: 'translateY(50%)' }}
          >
            <div className="h-[2px] w-8 bg-primary" />
            <div className="ml-2 flex flex-col">
              <span className="text-xs text-muted-foreground">Loyer de référence</span>
              <span className="text-sm font-medium">{formatRent(referenceRent)}</span>
            </div>
          </div>

          {/* Marqueur - Loyer majoré (max autorisé) */}
          <div 
            className="absolute left-0 right-0 flex items-center"
            style={{ bottom: `${maxPos}%`, transform: 'translateY(50%)' }}
          >
            <div className="h-[2px] w-8 bg-orange-500 border-dashed" />
            <div className="ml-2 flex flex-col">
              <span className="text-xs text-muted-foreground">Loyer majoré (max)</span>
              <span className="text-sm font-medium">{formatRent(maxRent)}</span>
            </div>
          </div>

          {/* Marqueur - Votre loyer (plus visible) */}
          <div 
            className="absolute left-0 right-0 flex items-center z-10"
            style={{ bottom: `${currentPos}%`, transform: 'translateY(50%)' }}
          >
            <div className={`h-3 w-3 rounded-full ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className={`h-[3px] flex-1 max-w-16 ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className="ml-2 flex flex-col">
              <span className={`text-xs font-semibold ${isCompliant ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Votre loyer
              </span>
              <span className={`text-sm font-bold ${isCompliant ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatRent(currentRent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-green-100 border-l-2 border-green-500" />
          <span>Zone conforme</span>
        </div>
        {exceedsMax && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-100 border-l-2 border-red-500" />
            <span>Dépassement</span>
          </div>
        )}
      </div>
    </div>
  );
}
