import React from 'react';
import { View } from 'react-native';
import BrandCard from '../../src/marketplace/BrandCard';

const wrap = { width: 170 } as const;

export function Product() {
  return (
    <View style={wrap}>
      <BrandCard
        brand={{
          id: 1,
          name: 'Kopi Senja',
          type: 'product',
          category: 'Minuman',
          city: 'Bandung',
          logo: { full: 'https://picsum.photos/seed/kopisenja/300', thumbnail: 'https://picsum.photos/seed/kopisenja/300' },
          has_location: true,
          owner_id: 10,
          is_featured: true,
          product_count: 18,
          rating_average: 4.6,
          rating_count: 32,
        }}
        onPress={() => {}}
      />
    </View>
  );
}

export function ServiceNoLogo() {
  return (
    <View style={wrap}>
      <BrandCard
        brand={{
          id: 2,
          name: 'Rumah Jahit Ayu',
          type: 'service',
          category: 'Fashion',
          city: 'Surabaya',
          logo: null,
          has_location: false,
          owner_id: 11,
          rating_average: null,
          rating_count: 0,
        }}
        onPress={() => {}}
      />
    </View>
  );
}
