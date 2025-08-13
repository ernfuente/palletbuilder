// Simple loading fallback components
export const VisualizationLoader = () => (
  <div className="w-full h-[600px] bg-gray-50 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading 3D Visualization...</p>
      <p className="text-gray-500 text-sm mt-1">Preparing interactive preview</p>
    </div>
  </div>
)

export const ValidationLoader = () => (
  <div className="w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center">
    <div className="animate-pulse flex space-x-4 w-full max-w-md">
      <div className="rounded-full bg-gray-300 h-10 w-10"></div>
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  </div>
)
