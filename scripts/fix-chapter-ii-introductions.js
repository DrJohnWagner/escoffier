const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const chapterPath = path.join(projectRoot, 'data', 'chapters', 'chapter-ii.json');
const backupPath = chapterPath + '.bak';

const data = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

let changed = 0;

if (Array.isArray(data.sections)) {
  data.sections.forEach(section => {
    if (Array.isArray(section.entries)) {
      section.entries.forEach(entry => {
        if (Array.isArray(entry.introduction)) {
          const arr = entry.introduction;
          const allStrings = arr.every(item => typeof item === 'string');
          if (allStrings) {
            if (arr.length === 1) {
              entry.introduction = arr[0];
            } else {
              // convert to object preserving elements
              entry.introduction = { "Introduction": arr };
            }
            changed += 1;
          }
        }
      });
    }
  });
}

if (changed > 0) {
  fs.writeFileSync(chapterPath, JSON.stringify(data, null, 2));
  console.log(`Patched ${changed} introduction(s) in data/chapters/chapter-ii.json (backup at ${backupPath})`);
  process.exit(0);
} else {
  console.log('No introduction arrays requiring fix found.');
  process.exit(0);
}
