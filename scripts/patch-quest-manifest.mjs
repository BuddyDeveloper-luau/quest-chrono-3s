import fs from 'node:fs';
const p = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(p, 'utf8').replace(/android:screenOrientation="[^"]*"/g, 'android:screenOrientation="unspecified"');
if (!m.includes('android:resizeableActivity')) m = m.replace('<activity', '<activity android:resizeableActivity="true"');
if (!m.includes('WAKE_LOCK')) m = m.replace('<application', '<uses-permission android:name="android.permission.WAKE_LOCK" />\n    <application');
fs.writeFileSync(p, m);
