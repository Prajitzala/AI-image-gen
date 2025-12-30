export interface UploadedImage {
  file: File;
  preview: string;
  name: string;
  size: number;
}

export interface OutfitGenerationRequest {
  topImage: string; // base64
  bottomImage: string; // base64
  personImage?: string; // base64, optional
}

export interface OutfitGenerationResponse {
  imageUrl: string;
  error?: string;
}

export interface ClothingItem {
  id: string;
  user_id: string;
  type: 'top' | 'bottom';
  image_url: string;
  created_at: string;
}

export interface GeneratedOutfit {
  id: string;
  user_id: string;
  top_id: string;
  bottom_id: string;
  result_image_url: string;
  created_at: string;
}





