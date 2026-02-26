import fs from 'fs';
const txt = fs.readFileSync('par2.txt', 'utf16le');
try {
    const jsonStr = txt.substring(txt.indexOf('{'));
    const obj = JSON.parse(jsonStr);
    console.log("CRITICAL ERROR DESCRIPTION:");
    console.log(obj.error_description);
} catch (e) {
    console.log("Failed to parse JSON", e);
}
