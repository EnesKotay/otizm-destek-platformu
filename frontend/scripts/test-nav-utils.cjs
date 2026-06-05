const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '..', 'src', 'components', 'layout', 'navUtils.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const { outputText, diagnostics } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});

assert.equal(diagnostics?.length || 0, 0, 'navUtils.ts should transpile without diagnostics');

const sandbox = {
  exports: {},
  module: { exports: {} },
  require,
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(outputText, sandbox, { filename: sourcePath });

const {
  filterCommandItems,
  getBadgeLabel,
  getDisabledReason,
  getGroupBadgeTotal,
  moveSelection,
} = sandbox.module.exports;

assert.equal(getBadgeLabel(0), null);
assert.equal(getBadgeLabel(12), '9+');
assert.equal(getBadgeLabel('!'), '!');

assert.equal(
  getGroupBadgeTotal(
    {
      label: 'Topluluk',
      items: [
        { to: '/messages', label: 'Mesajlar', badgeKey: 'messages' },
        { to: '/crisis', label: 'Kriz', badgeKey: 'crisis' },
      ],
    },
    { messages: 4, crisis: '!' }
  ),
  5
);

assert.equal(getDisabledReason({ requiresChild: true }, { hasChild: false, isExpertVerified: true }), 'Önce çocuk profili ekleyin');
assert.equal(getDisabledReason({ requiresVerifiedExpert: true }, { hasChild: true, isExpertVerified: false }), 'Uzman hesabı doğrulandıktan sonra açılır');
assert.equal(getDisabledReason({}, { hasChild: true, isExpertVerified: true }), null);

assert.deepEqual(
  filterCommandItems(
    [
      { label: 'Günlük Takip', group: 'Ana Akış' },
      { label: 'Mesajlar', group: 'Topluluk' },
    ],
    'gunluk'
  ),
  [{ label: 'Günlük Takip', group: 'Ana Akış' }]
);
assert.deepEqual(
  filterCommandItems(
    [
      { label: 'Günlük Takip', group: 'Ana Akış' },
      { label: 'Mesajlar', group: 'Topluluk' },
    ],
    'gün'
  ),
  [{ label: 'Günlük Takip', group: 'Ana Akış' }]
);

assert.equal(moveSelection(0, -1, 3), 2);
assert.equal(moveSelection(2, 1, 3), 0);
assert.equal(moveSelection(0, 1, 0), 0);

console.log('navUtils checks passed');
