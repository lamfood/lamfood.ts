export interface LocationInfo {
  lat: number
  lng: number
}

export interface RestaurantConfig {
  name: string
  nameEn: string
  tagline: string
  logo: string
  heroImage: string
  about: string
  openTimeText: string
  openHourFrom: string
  openHourTo: string
  phone: string
  whatsapp: string
  address: string
  location: LocationInfo
  instagram: string
  snappfood: string
}

export interface MenuItemDTO {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image: string | null
  available: boolean
  sortOrder: number
}

export type MenuResponse = { items: MenuItemDTO[] }
export type PublicConfigResponse = { restaurant: RestaurantConfig }
