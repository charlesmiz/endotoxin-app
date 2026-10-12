import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { APP_VERSION, APP_VERSION_LABEL } from './version';

describe('Application Version Constants', () => {
  it('APP_VERSION equals the version field of package.json', () => {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const rawContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(rawContent);

    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION_LABEL).toBe(`v${pkg.version} (Research Edition)`);
  });
});
