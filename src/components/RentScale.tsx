interface RentScaleProps {
  minRent: number;
  referenceRent: number;
  maxRent: number;
  currentRent: number;
  isCompliant: boolean;
}

const RentScale = ({ minRent, referenceRent, maxRent, currentRent, isCompliant }: RentScaleProps) => {
  // Calculate scale boundaries with padding
  const scaleMin = minRent * 0.9;
  const scaleMax = Math.max(maxRent, currentRent) * 1.1;
  const scaleRange = scaleMax - scaleMin;

  // Calculate positions as percentages (from bottom)
  const getPosition = (value: number) => {
    return ((value - scaleMin) / scaleRange) * 100;
  };

  const minPos = getPosition(minRent);
  const refPos = getPosition(referenceRent);
  const maxPos = getPosition(maxRent);
  const currentPos = getPosition(currentRent);

  const formatRent = (value: number) => {
    return value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  };

  return (
    <div className="relative h-72 w-full flex">
      {/* Scale bar container */}
      <div className="relative flex-1 ml-4 mr-4">
        {/* Background gradient zones */}
        <div 
          className="absolute left-0 right-0 bg-gradient-to-t from-green-100 via-green-50 to-orange-100 rounded-lg"
          style={{ 
            bottom: `${minPos}%`, 
            height: `${maxPos - minPos}%` 
          }}
        />
        
        {/* Overage zone (if rent exceeds max) */}
        {currentRent > maxRent && (
          <div 
            className="absolute left-0 right-0 bg-red-100 rounded-t-lg"
            style={{ 
              bottom: `${maxPos}%`, 
              height: `${currentPos - maxPos}%` 
            }}
          />
        )}

        {/* Vertical axis line */}
        <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-border rounded-full" />

        {/* Min rent marker */}
        <div 
          className="absolute left-0 right-0 flex items-center"
          style={{ bottom: `${minPos}%`, transform: 'translateY(50%)' }}
        >
          <div className="flex-1 h-0.5 bg-green-400 rounded-full" />
          <div className="absolute right-0 translate-x-full pl-3 whitespace-nowrap">
            <div className="text-xs text-muted-foreground">Loyer minoré</div>
            <div className="text-sm font-medium text-green-600">{formatRent(minRent)} €</div>
          </div>
          <div className="absolute left-0 -translate-x-full pr-3 text-right whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-green-400 ml-auto" />
          </div>
        </div>

        {/* Reference rent marker */}
        <div 
          className="absolute left-0 right-0 flex items-center"
          style={{ bottom: `${refPos}%`, transform: 'translateY(50%)' }}
        >
          <div className="flex-1 h-0.5 bg-primary rounded-full" />
          <div className="absolute right-0 translate-x-full pl-3 whitespace-nowrap">
            <div className="text-xs text-muted-foreground">Loyer de référence</div>
            <div className="text-sm font-semibold text-primary">{formatRent(referenceRent)} €</div>
          </div>
          <div className="absolute left-0 -translate-x-full pr-3 text-right whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-primary ml-auto" />
          </div>
        </div>

        {/* Max rent marker */}
        <div 
          className="absolute left-0 right-0 flex items-center"
          style={{ bottom: `${maxPos}%`, transform: 'translateY(50%)' }}
        >
          <div className="flex-1 h-0.5 bg-orange-500 border-dashed" style={{ borderTopWidth: 2, backgroundColor: 'transparent', borderColor: 'rgb(249 115 22)' }} />
          <div className="absolute right-0 translate-x-full pl-3 whitespace-nowrap">
            <div className="text-xs text-muted-foreground">Loyer majoré (max)</div>
            <div className="text-sm font-semibold text-orange-600">{formatRent(maxRent)} €</div>
          </div>
          <div className="absolute left-0 -translate-x-full pr-3 text-right whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-orange-500 ml-auto" />
          </div>
        </div>

        {/* Current rent marker - prominent */}
        <div 
          className="absolute left-0 right-0 flex items-center z-10"
          style={{ bottom: `${currentPos}%`, transform: 'translateY(50%)' }}
        >
          <div 
            className={`flex-1 h-1 rounded-full ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`} 
          />
          <div className="absolute right-0 translate-x-full pl-3 whitespace-nowrap">
            <div 
              className={`px-3 py-1.5 rounded-lg shadow-md ${
                isCompliant 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              <div className="text-xs opacity-90">Votre loyer</div>
              <div className="text-base font-bold">{formatRent(currentRent)} €</div>
            </div>
          </div>
          <div className="absolute left-0 -translate-x-full pr-3 text-right whitespace-nowrap">
            <div 
              className={`w-4 h-4 rounded-full ml-auto shadow-md ${
                isCompliant ? 'bg-green-500' : 'bg-red-500'
              }`} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentScale;
