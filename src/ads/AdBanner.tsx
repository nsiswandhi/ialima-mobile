// Single static-image ad — used for home_banner (4:1) and the four
// *_header placements (16:9). Server already applied the
// random-if-more-than-1 selection, so this just renders whatever (if
// anything) comes back for the placement. Renders nothing while loading or
// empty, so it never reserves layout space with no ad configured.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, Linking, useWindowDimensions } from 'react-native';
import { adsApi, resolveAdTap, Ad, AdPlacement } from './api';

type Props = {
  placement: AdPlacement;
  aspectRatio: number; // width / height, e.g. 4 for 4:1, 16/9 for 16:9
  onInternalLink: (type: string, id: number) => void;
};

export default function AdBanner({ placement, aspectRatio, onInternalLink }: Props) {
  const { width } = useWindowDimensions();
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    let alive = true;
    adsApi.list(placement).then((res) => {
      if (!alive) return;
      const next = res.data[0] ?? null;
      setAd(next);
      if (next) adsApi.impression(next.id);
    }).catch(() => {});
    return () => { alive = false; };
  }, [placement]);

  if (!ad || !ad.image) return null;

  function handleTap() {
    if (!ad) return;
    adsApi.click(ad.id);
    const target = resolveAdTap(ad.target_url);
    if (target?.kind === 'internal') onInternalLink(target.type, target.id);
    else if (target?.kind === 'external') Linking.openURL(target.url);
  }

  const height = width / aspectRatio;

  return (
    <Pressable onPress={handleTap} style={{ width, height }}>
      <Image source={{ uri: ad.image }} style={{ width, height }} resizeMode="cover" />
    </Pressable>
  );
}
