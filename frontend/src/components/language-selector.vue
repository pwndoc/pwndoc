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

<script>
export default {
    name: "language-selector",
    data() {
        return {
            lang: "",
            langOptions: [
                { value: "en-US", label: "English" },
                { value: "fr-FR", label: "Français" },
                { value: "zh-CN", label: "中文" },
                { value: "de-DE", label: "Deutsch" }
            ],
        };
    },
    watch: {
        lang(lang) {
            this.$i18n.locale = lang;
            localStorage.setItem("system_language", lang);
        },
    },
    created: function () {
        var language = localStorage.getItem("system_language");
        if (language) {
            this.lang = language;
        }else{
            this.lang = "en-US";
            localStorage.setItem("system_language", this.lang);
        }
    },
};
</script>

<style>

</style>
