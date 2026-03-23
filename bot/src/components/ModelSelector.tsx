'use client';

import React, { useState, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
  description?: string;
  isFree?: boolean;
}

const ModelSelector: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/models', {
        cache: 'no-store', // Ensures we get fresh data on every request
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      const data: Model[] = await response.json();
      setModels(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  if (loading) return <div className="p-4">Loading models...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-3">
        <label htmlFor="model-select" className="font-medium w-32">
          Select model:
        </label>
        <select
          id="model-select"
          className="border rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} {model.isFree && '(Free)'}
            </option>
          ))}
        </select>
        <button
          onClick={fetchModels}
          className="btn-refresh bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
          Refresh
        </button>
      </div>

      {/* Optional: Display model details */}
      <div className="border rounded p-4 bg-gray-50">
        <h3 className="font-semibold mb-2">Selected Model Details</h3>
        <p className="text-sm text-gray-600">
          Select a model from the dropdown above to see details.
        </p>
      </div>
    </div>
  );
};

export default ModelSelector;