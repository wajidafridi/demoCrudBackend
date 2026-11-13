import eslintConfigPrettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import { vueTsConfigs, withVueTs } from '@vue/eslint-config-typescript'

/**
 * Vue 3 + TypeScript flat config.
 * Prettier owns formatting; ESLint focuses on correctness (no stylistic overlap).
 */
export default withVueTs(
  {
    name: 'app/ignores',
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  eslintConfigPrettier,
)
