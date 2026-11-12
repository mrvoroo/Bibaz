import sharp from "sharp";
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#c8325e"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
<ellipse cx="256" cy="400" rx="170" ry="34" fill="#000" opacity=".18"/>
<path d="M86 250v120c0 28 76 46 170 46s170-18 170-46V250Z" fill="#fbdfe3"/>
<path d="M86 340v30c0 28 76 46 170 46s170-18 170-46v-30c0 28-76 46-170 46S86 368 86 340Z" fill="#b8742e"/>
<ellipse cx="256" cy="250" rx="170" ry="60" fill="#fff8ee"/>
<path d="M110 262c0 38 30 38 30 0M222 270c0 56 40 56 40 0M322 270c0 38 30 38 30 0" stroke="#fff8ee" stroke-width="34" stroke-linecap="round" fill="none"/>
<circle cx="256" cy="178" r="40" fill="#e8365b"/>
<path d="M236 144l20-26 20 26z" fill="#3e8e41"/>
</g></svg>`;
for (const [name, size, pad] of [["icon-192", 192, 40], ["icon-512", 512, 40], ["maskable-512", 512, 90], ["apple-touch-icon", 180, 36]]) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}.png`);
}
console.log("icons ok");
