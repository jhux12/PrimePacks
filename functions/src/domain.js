export const ID = /^[a-zA-Z0-9_-]{1,64}$/;
const rarities = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Ultra Rare",
  "Secret Rare",
  "Grail",
];
const grades = ["Raw", "PSA 9", "PSA 10", "BGS 10 Black Label"];
const categories = ["pokemon", "sports", "vintage"];
export function check(condition, message) {
  if (!condition) throw new Error(message);
}
export function text(value, name, max = 200) {
  check(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= max,
    `Invalid ${name}`,
  );
  return value.trim();
}
export function cents(value) {
  check(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 1000000,
    "Invalid monetary amount",
  );
  const result = Math.round(value * 100);
  check(
    Math.abs(value * 100 - result) < 0.00001,
    "Amounts must use at most two decimal places",
  );
  return result;
}
export function httpsUrl(value, name) {
  const url = new URL(text(value, name, 2048));
  check(
    url.protocol === "https:" && !url.username && !url.password,
    `${name} must be HTTPS`,
  );
  return url.href;
}
export function validatePack(input) {
  check(input && ID.test(input.id), "Invalid pack ID");
  check(categories.concat("all").includes(input.category), "Invalid category");
  check(
    ["budget", "standard", "high_roller", "whale"].includes(input.tier),
    "Invalid tier",
  );
  check(/^#[0-9a-fA-F]{6}$/.test(input.colorAccent), "Invalid accent color");
  check(cents(input.price) >= 50, "Pack price must be at least $0.50");
  check(
    Array.isArray(input.items) &&
      input.items.length >= 1 &&
      input.items.length <= 100,
    "A pack needs 1–100 items",
  );
  const ids = new Set();
  const items = input.items.map((item) => {
    check(
      item && ID.test(item.id) && !ids.has(item.id),
      "Card IDs must be valid and unique",
    );
    ids.add(item.id);
    check(
      rarities.includes(item.rarity) &&
        grades.includes(item.grade) &&
        categories.includes(item.category),
      "Invalid card classification",
    );
    check(
      Number.isFinite(item.odds) && item.odds >= 0 && item.odds <= 1000000,
      "Invalid odds weight",
    );
    cents(item.value);
    cents(item.usdValue);
    return {
      id: item.id,
      name: text(item.name, "card name"),
      set: text(item.set, "set"),
      number: text(item.number, "card number", 50),
      year: text(item.year, "year", 10),
      rarity: item.rarity,
      grade: item.grade,
      category: item.category,
      value: item.value,
      usdValue: item.usdValue,
      imageUrl: httpsUrl(item.imageUrl, "Card image"),
      odds: item.odds,
      ...(item.foilType &&
      ["holo", "textured", "vintage", "gold"].includes(item.foilType)
        ? { foilType: item.foilType }
        : {}),
    };
  });
  check(
    items.reduce((sum, i) => sum + i.odds, 0) > 0,
    "At least one card must have positive odds",
  );
  return {
    id: input.id,
    name: text(input.name, "pack name"),
    slug: text(input.slug, "slug", 80),
    description: text(input.description, "description", 2000),
    price: input.price,
    category: input.category,
    tier: input.tier,
    colorAccent: input.colorAccent,
    packCoverUrl:
      input.packCoverUrl === "/pack-cover.svg"
        ? "/pack-cover.svg"
        : httpsUrl(input.packCoverUrl, "Pack cover"),
    items,
    badgeText:
      typeof input.badgeText === "string" ? input.badgeText.slice(0, 40) : "",
  };
}
export function pickWeighted(items, random) {
  check(
    Number.isFinite(random) && random >= 0 && random < 1,
    "Invalid random value",
  );
  const total = items.reduce((sum, i) => {
    check(Number.isFinite(i.odds) && i.odds >= 0, "Invalid odds");
    return sum + i.odds;
  }, 0);
  check(Number.isFinite(total) && total > 0, "Pack has no positive odds");
  let cursor = random * total;
  for (const item of items) {
    if (item.odds > 0 && cursor < item.odds) return item;
    cursor -= item.odds;
  }
  return items.findLast((i) => i.odds > 0);
}
export function debit(balance, cost) {
  check(
    Number.isSafeInteger(balance) &&
      balance >= 0 &&
      Number.isSafeInteger(cost) &&
      cost > 0,
    "Invalid wallet amount",
  );
  check(balance >= cost, "Insufficient balance");
  return balance - cost;
}
export function validateAddress(input) {
  check(
    input && input.country === "US",
    "Shipping is currently available within the United States",
  );
  const address = Object.fromEntries(
    ["name", "street", "city", "state", "zip"].map((k) => [
      k,
      text(input[k], k, k === "street" ? 200 : 100),
    ]),
  );
  check(
    /^[A-Z]{2}$/.test(address.state) && /^\d{5}(-\d{4})?$/.test(address.zip),
    "Use a two-letter state and valid ZIP code",
  );
  check(
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
      .split(" ")
      .includes(address.state),
    "Use a supported US state",
  );
  return { ...address, country: "US" };
}
export function requireMember(auth) {
  check(
    auth &&
      auth.token?.firebase?.sign_in_provider !== "anonymous" &&
      auth.token?.email_verified === true,
    "Sign in with a verified email address",
  );
  return auth.uid;
}
export function requireAdmin(auth) {
  const uid = requireMember(auth);
  check(auth.token.admin === true, "Administrator permission required");
  return uid;
}
