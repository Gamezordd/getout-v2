import type { Category, Place } from "@/types/group";

export const DEMO_PLACES: Record<Category, Place[]> = {
  coffee: [
    { id: "bluebird",    name: "Bluebird Coffee Co.", type: "Specialty café",       distance: "3 min",  rating: "★ 4.7", imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&q=70" },
    { id: "thefilter",   name: "The Filter",           type: "Pour-over café",       distance: "7 min",  rating: "★ 4.5", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=120&q=70" },
    { id: "roastco",     name: "Roast & Co.",          type: "Café · Third-wave",    distance: "5 min",  rating: "★ 4.6", imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=120&q=70" },
    { id: "morninglight",name: "Morning Light",        type: "Brunch café",          distance: "9 min",  rating: "★ 4.4", imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=120&q=70" },
    { id: "groundwork",  name: "Groundwork",           type: "Espresso bar",         distance: "12 min", rating: "★ 4.3", imageUrl: "https://images.unsplash.com/photo-1513267048331-5611cad62e41?w=120&q=70" },
  ],
  alcohol: [
    { id: "communiti",   name: "Communiti",            type: "Gastropub · Ashok Nagar",  distance: "5 min",  rating: "★ 4.4", imageUrl: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=120&q=70" },
    { id: "pangeo",      name: "Pangeo",               type: "Rooftop · Brigade Rd",     distance: "3 min",  rating: "★ 4.5", imageUrl: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=120&q=70" },
    { id: "thirteenth",  name: "The 13th Floor",       type: "Rooftop · MG Road",        distance: "9 min",  rating: "★ 4.4", imageUrl: "https://images.unsplash.com/photo-1587899897387-091ebd01a6b2?w=120&q=70" },
    { id: "kaze",        name: "Kazé Bar & Kitchen",   type: "Bar · Ashok Nagar",        distance: "5 min",  rating: "★ 4.4", imageUrl: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=120&q=70" },
    { id: "skyye",       name: "Skyye Lounge",         type: "Lounge · UB City",         distance: "14 min", rating: "★ 4.6", imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=120&q=70" },
  ],
  food: [
    { id: "thecollective",name: "The Collective",      type: "Modern Indian",            distance: "6 min",  rating: "★ 4.6", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=120&q=70" },
    { id: "churchst",    name: "Church Street Social", type: "Bar food · Church St",     distance: "7 min",  rating: "★ 4.2", imageUrl: "https://images.unsplash.com/photo-1574096079513-d8259312b785?w=120&q=70" },
    { id: "bobs",        name: "Bob's Kitchen",        type: "Pub grub · Wood Street",   distance: "14 min", rating: "★ 4.1", imageUrl: "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=120&q=70" },
    { id: "ebony",       name: "Ebony",                type: "Fine dining · Rooftop",    distance: "11 min", rating: "★ 4.8", imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=120&q=70" },
    { id: "nagarjuna",   name: "Nagarjuna",            type: "Andhra · Rice meals",      distance: "4 min",  rating: "★ 4.3", imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=120&q=70" },
  ],
};

export const CATEGORY_META = {
  coffee:  { label: "Coffee", emoji: "☕", groupName: "Coffee run ☕",    color: "#e07f2b", desc: "Cafés, specialty roasters, brunch spots" },
  alcohol: { label: "Drinks", emoji: "🥂", groupName: "Drinks tonight 🥂", color: "#7c5cbf", desc: "Bars, rooftops, craft cocktails" },
  food:    { label: "Food",   emoji: "🍽️", groupName: "Dinner plans 🍽️",  color: "#3d8ef5", desc: "Restaurants, street food, date night" },
};

export type { Category };
