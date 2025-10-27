const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const projectRoot = process.cwd();
const schemaDir = path.join(projectRoot, 'data', 'schemas');
const chapterPath = path.join(projectRoot, 'data', 'chapters', 'chapter-ii.json');

// Load all schema files and add to Ajv so $refs resolve
const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.json'));
const ajv = new Ajv({ allErrors: true, strict: false });

for (const file of schemaFiles) {
  const full = path.join(schemaDir, file);
  const s = readJson(full);
  // use $id if present, otherwise use filename as key
  const key = s.$id || `file://${full}`;
  try {
    // avoid adding the same schema twice (duplicate $id causes an error)
    if (!ajv.getSchema(key)) {
      ajv.addSchema(s, key);
    }
    // Also register the schema under the common example.com/schemas/<filename> id
    const altKey = `https://example.com/schemas/${file}`;
    if (!ajv.getSchema(altKey)) {
      try {
        ajv.addSchema(s, altKey);
      } catch (err) {
        // ignore; adding under alternate key is best-effort
      }
    }
  } catch (err) {
    console.error('Failed to add schema', file, err.message);
    process.exit(3);
  }
}

const chapterSchemaPath = path.join(schemaDir, 'chapter-schema.json');
const chapterSchema = readJson(chapterSchemaPath);
let validate;
try {
  const schemaKey = chapterSchema.$id || `file://${chapterSchemaPath}`;
  const existing = ajv.getSchema(schemaKey);
  if (existing) {
    validate = existing;
  } else {
    validate = ajv.compile(chapterSchema);
  }
} catch (err) {
  console.error('Failed to compile chapter schema:', err.message);
  process.exit(4);
}

const data = readJson(chapterPath);
const valid = validate(data);
if (valid) {
  console.log('VALID: data/chapters/chapter-ii.json is valid according to chapter-schema.json');
  process.exit(0);
} else {
  console.error('INVALID: data/chapters/chapter-ii.json failed validation');
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(2);
}
