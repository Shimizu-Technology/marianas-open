import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DEFAULT_GALLERY_IMAGE_POLICY, type GalleryImagePolicy } from '../utils/galleryImagePolicy';

export function useGalleryImagePolicy(eventId: number) {
  const [state, setState] = useState<{ eventId: number; policy: GalleryImagePolicy }>();
  useEffect(() => {
    let current = true;
    void api.admin.getGalleryUploadPolicy(eventId).then(({ upload_policy }) => {
      if (current) setState({ eventId, policy: upload_policy });
    }).catch(() => { /* Keep the safe baseline if configuration is unavailable. */ });
    return () => { current = false; };
  }, [eventId]);
  return state?.eventId === eventId ? state.policy : DEFAULT_GALLERY_IMAGE_POLICY;
}
