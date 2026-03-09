export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(msg) => msg.includes('[autofix.ci]'), (msg) => msg.includes('dependabot')],
};
