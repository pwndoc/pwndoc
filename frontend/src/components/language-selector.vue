<template>
    <!-- ...... -->
    <q-select
        :label="$t('language')"
        v-model="lang"
        :options="langOptions"
        dense
        emit-value
        map-options
        options-dense
        outlined
    />
    <!-- ...... -->
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const lang = ref('');
const langOptions = [
  { value: "en-US", label: "English" },
  { value: "fr-FR", label: "Français" },
  { value: "zh-CN", label: "中文" },
  { value: "de-DE", label: "Deutsch" },
  { value: "pt-BR", label: "Portuguese" }
];

onMounted(() => {
  let language = localStorage.getItem("system_language");
  if (language) {
    lang.value = language;
  } else {
    lang.value = "en-US";
    localStorage.setItem("system_language", lang.value);
  }
});

watch(lang, (newLang) => {
  locale.value = newLang;
  localStorage.setItem("system_language", newLang);
});
</script>

<style>

</style>
