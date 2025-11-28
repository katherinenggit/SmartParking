interface MediaSourceSelectorProps {
  selectedSource: 'camera' | 'upload';
  onSourceChange: (source: 'camera' | 'upload') => void;
}

export function MediaSourceSelector({ selectedSource, onSourceChange }: MediaSourceSelectorProps) {
  return (
    <div className="bg-white p-3 rounded-lg shadow border border-gray-200 mb-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">Input Source:</span>
        <div className="flex gap-2">
          <button
            onClick={() => onSourceChange('camera')}
            className={`py-2 px-4 rounded-lg font-medium transition-all text-sm ${
              selectedSource === 'camera'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📹 Live Camera
          </button>
          
          <button
            onClick={() => onSourceChange('upload')}
            className={`py-2 px-4 rounded-lg font-medium transition-all text-sm ${
              selectedSource === 'upload'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📁 Upload
          </button>
        </div>
      </div>
    </div>
  );
}

