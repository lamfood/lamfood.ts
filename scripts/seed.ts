/**
 * Seed the LamFood menu with demo items (2 per category).
 * Usage:
 *   bun scripts/seed.ts            → seeds only when table is empty
 *   bun scripts/seed.ts --force    → wipes and reseeds
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ITEMS: {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  featured?: boolean;
}[] = [
  // Breakfast
  {
    name: "صبحانه ایرانی",
    description: "نیمرو، پنیر تازه، سبزی معطر، نان سنگک و چای دم‌کرده",
    price: 120,
    category: "breakfast",
    image: "/uploads/food-breakfast-1.png",
    featured: true,
  },
  {
    name: "پنکیک عسل و موز",
    description: "پنکیک حجیم با عسل طبیعی، موز تازه و گردو",
    price: 110,
    category: "breakfast",
    image: "/uploads/food-breakfast-2.png",
  },
  // Burgers
  {
    name: "چیزبرگر مخصوص لم",
    description: "برگر دست‌ساز ۱۵۰ گرمی با پنیر چدار، کاهو، گوجه و سس مخصوص لم",
    price: 200,
    category: "burgers",
    image: "/uploads/food-burgers-1.png",
    featured: true,
  },
  {
    name: "برگر مرغ تند",
    description: "فیله مرغ گریل‌شده با سس تند مکزیکی و سبزیجات تازه",
    price: 170,
    category: "burgers",
    image: "/uploads/food-burgers-2.png",
  },
  // Pizza
  {
    name: "پیتزا پپرونی",
    description: "خمیر ایتالیایی، پپرونی تند، پنیر موزارلا و سس گوجه خانگی",
    price: 250,
    category: "pizza",
    image: "/uploads/food-pizza-1.png",
    featured: true,
  },
  {
    name: "پیتزا باربیکیو مرغ",
    description: "مرغ گریل با سس باربیکیو، پیاز کاراملی و فلفل دلمه",
    price: 270,
    category: "pizza",
    image: "/uploads/food-pizza-2.png",
  },
  // Sandwich
  {
    name: "ساندویچ کلاب",
    description:
      "سه لایه نان تست با مرغ گریل، پنیر و سبزیجات تازه، همراه سیب‌زمینی",
    price: 190,
    category: "sandwich",
    image: "/uploads/food-sandwich-1.png",
  },
  {
    name: "ساندویچ فلافل",
    description: "فلافل تازه و ترد با سس ته‌چینه، ترشی و سبزی",
    price: 90,
    category: "sandwich",
    image: "/uploads/food-sandwich-2.png",
  },
  // Pasta
  {
    name: "پاستا آلفردو مرغ",
    description: "فتوچینی با سس خامه‌ای آلفردو، مرغ گریل و پارمزان",
    price: 210,
    category: "pasta",
    image: "/uploads/food-pasta-1.png",
  },
  {
    name: "پاستا بولونز",
    description: "اسپاگتی با سس گوشت ایتالیایی و ریحان تازه",
    price: 230,
    category: "pasta",
    image: "/uploads/food-pasta-2.png",
  },
  // Dessert
  {
    name: "کیک شکلاتی مذاب",
    description: "کیک شکلاتی گرم با مغز ذوب‌شده و بستنی وانیلی",
    price: 120,
    category: "dessert",
    image: "/uploads/food-dessert-1.png",
    featured: true,
  },
  {
    name: "چیزکیک نیویورکی",
    description: "چیزکیک کلاسیک کرمی با سس توت‌فرنگی تازه",
    price: 140,
    category: "dessert",
    image: "/uploads/food-dessert-2.png",
  },
  // Coffee
  {
    name: "لاته",
    description: "اسپرسو دوبل با شیر بخارپز و لاته‌آرت",
    price: 85,
    category: "coffee",
    image: "/uploads/food-coffee-1.png",
    featured: true,
  },
  {
    name: "آیس لاته",
    description: "اسپرسو سرد با شیر و یخ؛ خنک و مطبوع",
    price: 90,
    category: "coffee",
    image: "/uploads/food-coffee-2.png",
  },
  // Hot drinks (نوشیدنی گرم)
  {
    name: "هات چاکلت",
    description: "شکلات غنی و خامه‌ای با شیر گرم و خامهٔ تازه",
    price: 80,
    category: "hotDrinks",
    image: "/uploads/food-hotdrinks-1.png",
  },
  {
    name: "چای ماسالا",
    description: "چای سیاه با ادویهٔ هندی، شیر و عسل",
    price: 65,
    category: "hotDrinks",
    image: "/uploads/food-hotdrinks-2.png",
  },
  // Cold drinks (نوشیدنی سرد)
  {
    name: "آیس ته‌چینه",
    description: "ته‌چینه سرد با لیمو و یخ، طراوت‌بخش و سبک",
    price: 55,
    category: "coldDrinks",
    image: "/uploads/food-colddrinks-1.png",
  },
  {
    name: "لیموناد بلوبری",
    description: "لیموناد تازه با بلوبری و نعنا، خنک و خوش‌رنگ",
    price: 70,
    category: "coldDrinks",
    image: "/uploads/food-colddrinks-2.png",
  },
  // Herbal tea (دمنوش)
  {
    name: "دمنوش بهارنارنج",
    description: "عصارهٔ بهارنارنج با چای سبز، آرام‌بخش و خوش‌بو",
    price: 60,
    category: "herbalTea",
    image: "/uploads/food-herbaltea-1.png",
  },
  {
    name: "دمنوش بابونه و چوب‌چین",
    description: "ترکیب آرام‌بخش بابونه و چوب‌چین با عسل طبیعی",
    price: 65,
    category: "herbalTea",
    image: "/uploads/food-herbaltea-2.png",
  },
  // Shake (شیک)
  {
    name: "میلک‌شیک شکلاتی",
    description: "بستنی وانیلی و شکلات تلخ با شیر و خامه",
    price: 110,
    category: "shake",
    image: "/uploads/food-shake-1.png",
    featured: true,
  },
  {
    name: "شیک توت‌فرنگی",
    description: "توت‌فرنگی تازه با بستنی و شیر، خامه‌ای و خنک",
    price: 115,
    category: "shake",
    image: "/uploads/food-shake-2.png",
  },
  // Drinks
  {
    name: "موهیتو",
    description: "لیمو تازه، نعنا، سودا و شربت طبیعی",
    price: 75,
    category: "drinks",
    image: "/uploads/food-drinks-1.png",
  },
  {
    name: "لیموناد نعنا",
    description: "لیموناد خانگی با نعنا تازه و یخ فراوان",
    price: 60,
    category: "drinks",
    image: "/uploads/food-drinks-2.png",
  },
];

async function main() {
  const force = process.argv.includes("--force");
  const count = await db.menuItem.count();

  if (count > 0 && !force) {
    console.log(
      `Menu already has ${count} items — skipping (use --force to reseed).`,
    );
    return;
  }

  if (force) {
    await db.menuItem.deleteMany();
    console.log("Existing items removed.");
  }

  for (const [i, item] of ITEMS.entries()) {
    await db.menuItem.create({ data: { ...item, sortOrder: i } });
  }
  console.log(`✅ Seeded ${ITEMS.length} menu items.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
