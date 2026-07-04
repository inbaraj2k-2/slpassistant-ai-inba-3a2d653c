// Local data for offline therapeutic games. No external APIs.

export type Position = "initial" | "medial" | "final";
export type FlashcardWord = { word: string; sentence: string };

// Curated word lists per target sound and position (10 each).
// Words chosen so the target sound appears in that position.
export const ARTIC_SOUNDS: Record<string, Record<Position, string[]>> = {
  P: {
    initial: ["Pig", "Pan", "Pen", "Pop", "Pear", "Pin", "Pot", "Puppy", "Pizza", "Paint"],
    medial: ["Apple", "Happy", "Puppy", "Zipper", "Paper", "Copy", "Napkin", "Puppet", "Slipper", "Super"],
    final: ["Cup", "Map", "Top", "Cap", "Soap", "Sheep", "Jump", "Lamp", "Grape", "Rope"],
  },
  B: {
    initial: ["Ball", "Bus", "Bed", "Bag", "Boy", "Book", "Bear", "Bird", "Bat", "Bike"],
    medial: ["Baby", "Rabbit", "Ribbon", "Robot", "Zebra", "Rubber", "Bubble", "Cabin", "Table", "Number"],
    final: ["Cab", "Web", "Tub", "Crab", "Grab", "Cub", "Rob", "Job", "Lab", "Sob"],
  },
  M: {
    initial: ["Mom", "Man", "Moon", "Mouse", "Milk", "Mud", "Map", "Mask", "Mango", "Mouth"],
    medial: ["Hammer", "Camel", "Lemon", "Tomato", "Family", "Summer", "Hammer", "Number", "Dreamer", "Tummy"],
    final: ["Ham", "Drum", "Broom", "Gum", "Home", "Jam", "Room", "Time", "Foam", "Storm"],
  },
  T: {
    initial: ["Top", "Toy", "Table", "Tent", "Teeth", "Tiger", "Ten", "Tail", "Turtle", "Tomato"],
    medial: ["Water", "Butter", "Letter", "Motor", "Rotate", "Cotton", "Guitar", "Potato", "Kitten", "Sister"],
    final: ["Cat", "Hat", "Bat", "Boat", "Foot", "Coat", "Kite", "Nut", "Pet", "Salt"],
  },
  D: {
    initial: ["Dog", "Doll", "Duck", "Door", "Dad", "Deer", "Desk", "Dive", "Drum", "Dance"],
    medial: ["Ladder", "Radio", "Spider", "Ready", "Body", "Muddy", "Pudding", "Riding", "Cider", "Under"],
    final: ["Bed", "Bird", "Head", "Bread", "Cloud", "Bad", "Sad", "Kid", "Load", "Red"],
  },
  N: {
    initial: ["Nose", "Net", "Nut", "Nap", "Nine", "Nest", "Neck", "Night", "Nail", "Noodle"],
    medial: ["Banana", "Money", "Sunny", "Piano", "Peanut", "Journey", "Tiny", "Bunny", "Winner", "Corner"],
    final: ["Sun", "Fan", "Pan", "Rain", "Moon", "Bone", "Green", "Man", "Ten", "Coin"],
  },
  K: {
    initial: ["Cat", "Cup", "Key", "Kite", "Cow", "Cake", "Corn", "Coat", "King", "Cookie"],
    medial: ["Bacon", "Cracker", "Chicken", "Basket", "Broken", "Pocket", "Jacket", "Rocket", "Monkey", "Donkey"],
    final: ["Book", "Duck", "Rock", "Milk", "Fork", "Lock", "Sock", "Snake", "Bike", "Cake"],
  },
  G: {
    initial: ["Go", "Girl", "Gum", "Goat", "Game", "Gate", "Gift", "Ghost", "Gold", "Green"],
    medial: ["Wagon", "Sugar", "Tiger", "Finger", "Dragon", "Magic", "Bagel", "Igloo", "Wiggle", "Piggy"],
    final: ["Pig", "Bag", "Egg", "Frog", "Dog", "Log", "Rug", "Bug", "Hug", "Jog"],
  },
  F: {
    initial: ["Fish", "Fan", "Foot", "Fire", "Fork", "Four", "Fox", "Face", "Farm", "Feather"],
    medial: ["Muffin", "Coffee", "Elephant", "Sofa", "Trophy", "Waffle", "Dolphin", "Alphabet", "Confetti", "Awful"],
    final: ["Leaf", "Roof", "Knife", "Half", "Chef", "Beef", "Cliff", "Wolf", "Golf", "Puff"],
  },
  V: {
    initial: ["Van", "Vase", "Vet", "Vine", "Vote", "Very", "View", "Vest", "Volcano", "Vacuum"],
    medial: ["Oven", "River", "Cover", "Seven", "Movie", "Beaver", "Never", "Driver", "Diver", "Silver"],
    final: ["Five", "Hive", "Cave", "Give", "Love", "Move", "Wave", "Save", "Dive", "Glove"],
  },
  S: {
    initial: ["Sun", "Snake", "Sock", "Soap", "Sand", "Seven", "Sing", "Sit", "Star", "Soup"],
    medial: ["Bicycle", "Whistle", "Pencil", "Castle", "Missing", "Basket", "Whisper", "Passing", "Lesson", "Racer"],
    final: ["Bus", "Yes", "Kiss", "House", "Ice", "Grass", "Glass", "Dress", "Class", "Mouse"],
  },
  Z: {
    initial: ["Zoo", "Zip", "Zero", "Zebra", "Zone", "Zoom", "Zigzag", "Zombie", "Zinc", "Zap"],
    medial: ["Buzzer", "Puzzle", "Muzzle", "Dozen", "Lizard", "Wizard", "Blizzard", "Cousin", "Dazzle", "Fuzzy"],
    final: ["Buzz", "Fizz", "Jazz", "Nose", "Cheese", "Rose", "Prize", "Freeze", "Sneeze", "Breeze"],
  },
  SH: {
    initial: ["Ship", "Shoe", "Shark", "Shell", "Sheep", "Shop", "Shirt", "Shovel", "Shower", "Shine"],
    medial: ["Ocean", "Cushion", "Washing", "Fishing", "Motion", "Pushing", "Mushroom", "Dishes", "Rushing", "Bushel"],
    final: ["Fish", "Dish", "Brush", "Wish", "Push", "Crash", "Splash", "Wash", "Cash", "Trash"],
  },
  CH: {
    initial: ["Chair", "Cheese", "Chicken", "Chin", "Chip", "Cherry", "Chocolate", "Choose", "Church", "Child"],
    medial: ["Teacher", "Kitchen", "Matches", "Watches", "Nature", "Picture", "Catcher", "Ketchup", "Sandwich", "Pitcher"],
    final: ["Beach", "Peach", "Bench", "Watch", "Coach", "Lunch", "Rich", "Torch", "Match", "Punch"],
  },
  J: {
    initial: ["Jam", "Jump", "Juice", "Jet", "Jar", "Jelly", "Judge", "Joke", "Jacket", "Jewel"],
    medial: ["Magic", "Angel", "Danger", "Manager", "Injury", "Enjoy", "Digital", "Legend", "Pigeon", "Wager"],
    final: ["Cage", "Page", "Bridge", "Fridge", "Orange", "Judge", "Edge", "Garage", "Age", "Village"],
  },
  L: {
    initial: ["Lion", "Leaf", "Log", "Lamp", "Lock", "Lake", "Lemon", "Ladder", "Letter", "Light"],
    medial: ["Balloon", "Pillow", "Yellow", "Salad", "Follow", "Jelly", "Hello", "Ballet", "Belly", "Silly"],
    final: ["Ball", "Bell", "Doll", "Owl", "Whale", "Wheel", "Snail", "Pool", "Nail", "Tail"],
  },
  R: {
    initial: ["Rabbit", "Rain", "Red", "Ring", "Rock", "Rope", "Roof", "Rug", "Robot", "River"],
    medial: ["Carrot", "Cherry", "Berry", "Story", "Very", "Marry", "Sorry", "Barrel", "Around", "Parrot"],
    final: ["Car", "Star", "Door", "Bear", "Deer", "Chair", "Ear", "Four", "Bird", "Corner"],
  },
  TH_voiced: {
    initial: ["The", "This", "That", "Then", "Them", "There", "These", "Those", "They", "Though"],
    medial: ["Mother", "Father", "Brother", "Feather", "Weather", "Leather", "Other", "Bother", "Rather", "Gather"],
    final: ["Bathe", "Breathe", "Smooth", "Soothe", "Loathe", "Clothe", "Tithe", "Lathe", "Writhe", "Scythe"],
  },
  TH_voiceless: {
    initial: ["Thumb", "Think", "Thin", "Thick", "Thanks", "Third", "Thief", "Thorn", "Thorn", "Thunder"],
    medial: ["Bathtub", "Nothing", "Anything", "Something", "Athlete", "Ether", "Author", "Method", "Python", "Toothbrush"],
    final: ["Bath", "Tooth", "Math", "Mouth", "Path", "Cloth", "Both", "Fifth", "Moth", "Breath"],
  },
  NG: {
    initial: ["Ngoma", "Ngai", "Ngo", "Ngeru", "Ngwee", "Nguni", "Ngultrum", "Nguyen", "Ngram", "Ngan"],
    medial: ["Singer", "Finger", "Hanger", "Longer", "Ringer", "Hunger", "Anger", "Jungle", "Bangle", "Single"],
    final: ["Ring", "Sing", "King", "Wing", "String", "Song", "Long", "Bring", "Hung", "Strong"],
  },
};

// Emoji lookup for common concrete nouns. Words not in the map render a
// letter tile — a graceful fallback so nothing shows a wrong picture.
export const WORD_EMOJI: Record<string, string> = {
  sun: "☀️", snake: "🐍", sock: "🧦", soap: "🧼", sand: "🏖️", seven: "7️⃣", star: "⭐", soup: "🍲",
  bus: "🚌", house: "🏠", ice: "🧊", grass: "🌱", glass: "🥛", dress: "👗", mouse: "🐭",
  pig: "🐷", pan: "🍳", pen: "🖊️", pear: "🍐", pot: "🍲", puppy: "🐶", pizza: "🍕", paint: "🎨",
  apple: "🍎", cup: "☕", map: "🗺️", cap: "🧢", sheep: "🐑", grape: "🍇", rope: "🪢",
  ball: "⚽", bus2: "🚌", bed: "🛏️", bag: "👜", boy: "👦", book: "📖", bear: "🐻", bird: "🐦", bat: "🦇", bike: "🚲",
  baby: "👶", rabbit: "🐰", robot: "🤖", zebra: "🦓", table: "🪑",
  crab: "🦀", cub: "🐻",
  mom: "👩", man: "👨", moon: "🌙", milk: "🥛", mango: "🥭", mouth: "👄",
  ham: "🥓", drum: "🥁", broom: "🧹", gum: "🍬", home: "🏠", jam: "🍓",
  top: "🔝", toy: "🧸", tent: "⛺", teeth: "🦷", tiger: "🐯", ten: "🔟", turtle: "🐢", tomato: "🍅",
  water: "💧", cat: "🐱", hat: "🎩", boat: "🚤", foot: "🦶", coat: "🧥", kite: "🪁", nut: "🌰", salt: "🧂",
  dog: "🐶", doll: "🪆", duck: "🦆", door: "🚪", dad: "👨", deer: "🦌", desk: "🖥️", dance: "💃",
  ladder: "🪜", spider: "🕷️", bread: "🍞", cloud: "☁️", red: "🟥",
  nose: "👃", net: "🥅", nine: "9️⃣", nest: "🪺", neck: "🧣", night: "🌙", nail: "🔨", noodle: "🍜",
  banana: "🍌", money: "💵", piano: "🎹", peanut: "🥜", bunny: "🐇",
  fan: "🌀", rain: "🌧️", bone: "🦴",
  key: "🔑", cow: "🐮", cake: "🍰", corn: "🌽", king: "👑", cookie: "🍪",
  bacon: "🥓", chicken: "🐔", basket: "🧺", pocket: "👖", jacket: "🧥", rocket: "🚀", monkey: "🐵", donkey: "🐴",
  rock: "🪨", fork: "🍴", lock: "🔒",
  go: "🚦", girl: "👧", goat: "🐐", game: "🎮", gate: "🚪", gift: "🎁", ghost: "👻", gold: "🥇", green: "🟩",
  wagon: "🛻", sugar: "🍬", finger: "☝️", dragon: "🐉", magic: "🎩", igloo: "🛖", piggy: "🐷",
  egg: "🥚", frog: "🐸", log: "🪵", rug: "🧶", bug: "🐛", hug: "🤗",
  fish: "🐟", fire: "🔥", four: "4️⃣", fox: "🦊", face: "😀", farm: "🚜", feather: "🪶",
  muffin: "🧁", coffee: "☕", elephant: "🐘", sofa: "🛋️", trophy: "🏆", waffle: "🧇", dolphin: "🐬",
  leaf: "🍃", roof: "🏠", knife: "🔪", chef: "👨‍🍳", beef: "🥩", wolf: "🐺", golf: "⛳",
  van: "🚐", vase: "🏺", vine: "🍇", vote: "🗳️", view: "🌄", vest: "🦺", volcano: "🌋", vacuum: "🧹",
  oven: "🔥", river: "🏞️", movie: "🎬", beaver: "🦫", diver: "🤿", silver: "🥈",
  five: "5️⃣", hive: "🍯", cave: "🕳️", love: "❤️", wave: "🌊", glove: "🧤",
  zoo: "🦁", zip: "🤐", zero: "0️⃣",
  puzzle: "🧩", lizard: "🦎", wizard: "🧙",
  cheese: "🧀", rose: "🌹", prize: "🏆",
  ship: "🚢", shoe: "👟", shark: "🦈", shell: "🐚", shop: "🏪", shirt: "👕", shovel: "⛏️", shower: "🚿",
  ocean: "🌊", mushroom: "🍄",
  dish: "🍽️", brush: "🖌️", trash: "🗑️", cash: "💵",
  chair: "🪑", chin: "😐", chip: "🍟", cherry: "🍒", chocolate: "🍫", church: "⛪", child: "🧒",
  teacher: "👩‍🏫", kitchen: "🍳", picture: "🖼️", ketchup: "🥫", sandwich: "🥪",
  beach: "🏖️", peach: "🍑", bench: "🪑", watch: "⌚", coach: "🚌", lunch: "🍱", match: "🔥",
  juice: "🧃", jet: "✈️", jar: "🫙", jelly: "🍮", judge: "⚖️", joke: "😂", jewel: "💎",
  angel: "😇", bridge: "🌉", fridge: "🧊", orange: "🍊", garage: "🏚️", age: "📅",
  lion: "🦁", lamp: "💡", lake: "🏞️", lemon: "🍋", letter: "✉️", light: "💡",
  balloon: "🎈", pillow: "🛌", yellow: "🟨", salad: "🥗", hello: "👋", belly: "🤰",
  bell: "🔔", owl: "🦉", whale: "🐳", wheel: "🎡", snail: "🐌", pool: "🏊", tail: "🦎",
  carrot: "🥕", berry: "🍓", parrot: "🦜", story: "📖",
  car: "🚗", chair2: "🪑", ear: "👂",
  the: "🔤", this: "🔤", that: "🔤", them: "🔤", they: "🔤",
  mother: "👩", father: "👨", brother: "👦", weather: "🌤️",
  thumb: "👍", think: "💭", thanks: "🙏", thunder: "⛈️",
  bath: "🛁", tooth: "🦷", math: "➗", moth: "🦋", cloth: "🧵", breath: "💨",
  ring: "💍", sing: "🎤", wing: "🪽", song: "🎵",
};

export function emojiFor(word: string): string | null {
  return WORD_EMOJI[word.toLowerCase()] ?? null;
}

/* ---------------- Sorting categories ---------------- */
export type SortCategory =
  | "Animals" | "Foods" | "Vehicles"
  | "Clothes" | "Fruits" | "Vegetables"
  | "Body Parts" | "Household Items" | "School Items"
  | "Occupations" | "Emotions";

export const SORT_ITEMS: Record<SortCategory, string[]> = {
  Animals: [
    "Dog","Cat","Cow","Horse","Sheep","Goat","Pig","Rabbit","Lion","Tiger","Elephant","Monkey","Bear","Wolf","Fox","Deer","Zebra","Giraffe","Kangaroo","Panda",
    "Koala","Hippo","Rhino","Camel","Donkey","Buffalo","Squirrel","Rat","Mouse","Hamster","Bat","Owl","Eagle","Parrot","Pigeon","Sparrow","Duck","Goose","Chicken","Turkey",
    "Fish","Shark","Whale","Dolphin","Octopus","Crab","Lobster","Frog","Snake","Lizard",
  ],
  Foods: [
    "Bread","Rice","Pasta","Pizza","Burger","Sandwich","Noodles","Soup","Salad","Cheese",
    "Butter","Yogurt","Milk","Egg","Chicken","Beef","Fish","Shrimp","Bacon","Ham",
    "Cake","Cookie","Donut","Ice cream","Chocolate","Candy","Muffin","Pancake","Waffle","Pie",
    "Popcorn","Chips","Fries","Cereal","Oats","Honey","Jam","Peanut butter","Sushi","Taco",
    "Curry","Dumpling","Biryani","Samosa","Kebab","Omelette","Toast","Bagel","Pretzel","Cracker",
  ],
  Vehicles: [
    "Car","Bus","Truck","Van","Bike","Motorcycle","Scooter","Bicycle","Taxi","Ambulance",
    "Fire truck","Police car","Tractor","Jeep","Helicopter","Airplane","Rocket","Boat","Ship","Submarine",
    "Yacht","Canoe","Kayak","Sailboat","Ferry","Train","Subway","Tram","Monorail","Cable car",
    "Skateboard","Rollerblade","Segway","Golf cart","Forklift","Bulldozer","Crane","Dump truck","Cement mixer","Snowplow",
    "Race car","Limousine","Convertible","SUV","Minivan","Pickup","Camper","Trailer","Hot air balloon","Glider",
  ],
  Clothes: [
    "Shirt","T-shirt","Pants","Jeans","Shorts","Dress","Skirt","Sweater","Hoodie","Jacket",
    "Coat","Scarf","Hat","Cap","Gloves","Socks","Shoes","Boots","Sandals","Sneakers",
    "Belt","Tie","Suit","Blouse","Pyjamas","Swimsuit","Uniform","Raincoat","Vest","Bathrobe",
  ],
  Fruits: [
    "Apple","Banana","Orange","Grape","Mango","Pineapple","Strawberry","Blueberry","Watermelon","Peach",
    "Pear","Cherry","Kiwi","Lemon","Lime","Papaya","Guava","Plum","Pomegranate","Coconut",
    "Apricot","Fig","Date","Cranberry","Raspberry","Blackberry","Melon","Passionfruit","Lychee","Jackfruit",
  ],
  Vegetables: [
    "Carrot","Potato","Tomato","Onion","Garlic","Cabbage","Cauliflower","Broccoli","Spinach","Lettuce",
    "Cucumber","Pumpkin","Corn","Peas","Beans","Radish","Beetroot","Bell pepper","Eggplant","Zucchini",
    "Celery","Mushroom","Ginger","Turnip","Kale","Okra","Chili","Sweet potato","Asparagus","Leek",
  ],
  "Body Parts": [
    "Head","Hair","Eye","Ear","Nose","Mouth","Lip","Tooth","Tongue","Chin",
    "Neck","Shoulder","Arm","Elbow","Wrist","Hand","Finger","Thumb","Chest","Back",
    "Stomach","Hip","Leg","Knee","Ankle","Foot","Toe","Heel","Cheek","Forehead",
  ],
  "Household Items": [
    "Bed","Sofa","Chair","Table","Lamp","Clock","Mirror","Curtain","Pillow","Blanket",
    "Fridge","Oven","Microwave","Toaster","Kettle","Fan","Broom","Bucket","Mop","Vacuum",
    "Iron","Washer","Dryer","Television","Radio","Remote","Plate","Cup","Spoon","Knife",
  ],
  "School Items": [
    "Pencil","Pen","Eraser","Ruler","Book","Notebook","Bag","Backpack","Crayon","Marker",
    "Scissors","Glue","Paper","Chalk","Board","Desk","Chair","Calculator","Globe","Map",
    "Sharpener","Stapler","Highlighter","Folder","Binder","Tape","Compass","Protractor","Palette","Paintbrush",
  ],
  Occupations: [
    "Doctor","Nurse","Teacher","Engineer","Farmer","Chef","Baker","Pilot","Driver","Police",
    "Firefighter","Soldier","Lawyer","Judge","Dentist","Vet","Artist","Musician","Actor","Dancer",
    "Writer","Scientist","Astronaut","Carpenter","Plumber","Electrician","Mechanic","Barber","Tailor","Photographer",
  ],
  Emotions: [
    "Happy","Sad","Angry","Scared","Surprised","Excited","Bored","Tired","Sleepy","Nervous",
    "Calm","Confused","Worried","Proud","Shy","Curious","Jealous","Lonely","Hopeful","Grateful",
    "Silly","Brave","Frustrated","Embarrassed","Guilty","Relaxed","Anxious","Content","Disappointed","Loving",
  ],
};

export const SORT_CATEGORIES = Object.keys(SORT_ITEMS) as SortCategory[];
