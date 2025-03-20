'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '../ui/Spinner';

interface AddressMapViewProps {
  addressId: string;
}

interface MapData {
  address: string;
  apartment_number?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  boundingbox: string[];
  display_name: string;
}

export default function AddressMapView({ addressId }: AddressMapViewProps) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMapData = async () => {
      if (!addressId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/admin/addresses/map?id=${addressId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch map data');
        }
        
        const data = await response.json();
        setMapData(data);
      } catch (err) {
        console.error('Error fetching map data:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMapData();
  }, [addressId]);
  
  // Function to create OpenStreetMap URL
  const getMapUrl = () => {
    if (!mapData || !mapData.coordinates) return '';
    
    const { latitude, longitude } = mapData.coordinates;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.005},${longitude + 0.005},${latitude + 0.005}&layer=mapnik&marker=${latitude},${longitude}`;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 border border-gray-200 rounded-lg">
        <Spinner />
        <span className="ml-2 text-gray-600">Loading map...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <p className="font-medium">Error loading map</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  
  if (!mapData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">
        <p>No map data available for this address.</p>
      </div>
    );
  }
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="font-medium text-gray-900">
          {mapData.address}
          {mapData.apartment_number && (
            <span className="ml-1 text-gray-600">#{mapData.apartment_number}</span>
          )}
        </h3>
        <p className="text-sm text-gray-500 mt-1 truncate">{mapData.display_name}</p>
      </div>
      
      <div className="h-64 bg-gray-100">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={getMapUrl()}
          title="Address Map"
        ></iframe>
      </div>
      
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <p>Map data © OpenStreetMap contributors</p>
        <p className="mt-1">
          Coordinates: {mapData.coordinates.latitude.toFixed(6)}, {mapData.coordinates.longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
} 