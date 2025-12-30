'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { ClothingItem } from '@/lib/types';
import { User } from '@supabase/supabase-js';
import ImageUpload from './ImageUpload';
import { UploadedImage } from '@/lib/types';
import { X } from 'lucide-react';

interface WardrobeProps {
  user: User;
  onSelectTop: (item: ClothingItem) => void;
  onSelectBottom: (item: ClothingItem) => void;
}

export default function Wardrobe({ user, onSelectTop, onSelectBottom }: WardrobeProps) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'top' | 'bottom'>('all');
  const [uploadType, setUploadType] = useState<'top' | 'bottom' | null>(null);
  const [uploadImage, setUploadImage] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!config.supabaseEnabled) return;
    loadItems();
  }, [user, filter]);

  const loadItems = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      let query = supabase
        .from('clothing')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadImage || !uploadType) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadImage.file);
      formData.append('type', uploadType);
      formData.append('userId', user.id);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      setUploadImage(null);
      setUploadType(null);
      loadItems();
    } catch (error) {
      console.error('Error uploading:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('clothing')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (!config.supabaseEnabled) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">My Wardrobe</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setUploadType('top')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Top
          </button>
          <button
            onClick={() => setUploadType('bottom')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Bottom
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('top')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'top' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Tops
        </button>
        <button
          onClick={() => setFilter('bottom')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'bottom' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Bottoms
        </button>
      </div>

      {/* Upload Form */}
      {uploadType && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Upload {uploadType}</h3>
            <button
              onClick={() => {
                setUploadType(null);
                setUploadImage(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ImageUpload
            label=""
            description=""
            value={uploadImage}
            onChange={setUploadImage}
          />
          <button
            onClick={handleUpload}
            disabled={!uploadImage || uploading}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {/* Items Grid */}
      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-500">No items in wardrobe</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group cursor-pointer border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
              onClick={() => {
                if (item.type === 'top') {
                  onSelectTop(item);
                } else {
                  onSelectBottom(item);
                }
              }}
            >
              <img
                src={item.image_url}
                alt={item.type}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 bg-white">
                <p className="text-xs text-gray-600 capitalize">{item.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

